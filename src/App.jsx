import React, { useState, useCallback, useEffect, useRef } from "react";
import { Search, LayoutGrid, Moon, Sun, LogOut, Undo2, Redo2 } from "lucide-react";
import { DEFAULT_GROUPS, INITIAL_DESKS, generateId } from "./data";
import {
  loadGroups,
  loadDesks,
  saveGroups,
  saveDesks,
  deleteDesk,
  loadLabels,
  saveLabels,
  loadEmployees,
  saveEmployees,
  claimAdminSession,
  pingAdminSession,
  releaseAdminSession,
  subscribeToAdminSession
} from "./firebase";
import Sidebar from "./components/Sidebar";
import GridMap from "./components/GridMap";
import DeskDetails from "./components/DeskDetails";
import BatchActions from "./components/BatchActions";
import Login from "./components/Login";
import "./index.css";

const STORAGE_KEY_DESKS = "mapa_puestos_data";
const STORAGE_KEY_GROUPS = "mapa_puestos_groups";
const STORAGE_KEY_USER = "mapa_puestos_user";
const STORAGE_KEY_THEME = "mapa_puestos_theme";
const STORAGE_KEY_EMPLOYEES = "mapa_puestos_employees";
const STORAGE_KEY_LABELS = "mapa_puestos_labels";

const DEFAULT_LABELS = [
  { id: "lbl-dev", name: "Desarrollo", color: "#3b82f6" },
  { id: "lbl-rrhh", name: "RRHH", color: "#22c55e" },
  { id: "lbl-it", name: "IT", color: "#8b5cf6" },
  { id: "lbl-admin", name: "Administración", color: "#f59e0b" },
  { id: "lbl-ventas", name: "Ventas", color: "#ec4899" },
  { id: "lbl-ops", name: "Operaciones", color: "#06b6d4" },
];

function loadFromStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {}
  return fallback;
}

function saveToStorage(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

const MAX_HISTORY = 50;

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => loadFromStorage(STORAGE_KEY_USER, null));
  const [theme, setTheme] = useState(() => loadFromStorage(STORAGE_KEY_THEME, "light"));

  const isAdmin = currentUser?.role === "admin";

  const [groups, setGroups] = useState(() =>
    loadFromStorage(STORAGE_KEY_GROUPS, DEFAULT_GROUPS)
  );
  const [desks, setDesks] = useState(() => {
    const stored = loadFromStorage(STORAGE_KEY_DESKS, null);
    if (stored) {
      return stored.map(d => ({
        ...d,
        assignedUsers: d.assignedUsers || (d.assignedUser ? [d.assignedUser] : [])
      }));
    }
    return INITIAL_DESKS;
  });
  const [firebaseReady, setFirebaseReady] = useState(false);

  // Employees list
  const [employees, setEmployees] = useState(() =>
    loadFromStorage(STORAGE_KEY_EMPLOYEES, [])
  );

  // Custom labels
  const [labels, setLabels] = useState(() =>
    loadFromStorage(STORAGE_KEY_LABELS, DEFAULT_LABELS)
  );

  // Undo / Redo history
  const historyRef = useRef([]);
  const historyIndexRef = useRef(-1);
  const skipHistoryRef = useRef(false); // prevent recording when undoing/redoing

  // Snapshot what localStorage had at construction time, before any effects can overwrite it
  const initialLocalSnapshot = useRef({
    groups: loadFromStorage(STORAGE_KEY_GROUPS, null),
    desks: loadFromStorage(STORAGE_KEY_DESKS, null)
  });

  // On mount: decide the source of truth prioritizing Firebase, merging default groups if needed
  useEffect(() => {
    (async () => {
      const snapshot = initialLocalSnapshot.current;
      const fbGroups = await loadGroups();
      const fbDesks = await loadDesks();
      const fbLabels = await loadLabels();
      const fbEmployees = await loadEmployees();

      if (fbLabels && fbLabels.length > 0) {
        setLabels(fbLabels);
        saveToStorage(STORAGE_KEY_LABELS, fbLabels);
      }
      if (fbEmployees && fbEmployees.length > 0) {
        setEmployees(fbEmployees);
        saveToStorage(STORAGE_KEY_EMPLOYEES, fbEmployees);
      }

      let mergedGroups = fbGroups && fbGroups.length > 0 ? fbGroups : snapshot.groups;
      if (!mergedGroups || mergedGroups.length === 0) {
        mergedGroups = DEFAULT_GROUPS;
        await saveGroups(mergedGroups);
      }
      setGroups(mergedGroups);
      saveToStorage(STORAGE_KEY_GROUPS, mergedGroups);

      // Build sector mapping for healing if any sector had an alias/legacy ID
      const validSectorIds = new Set(mergedGroups.flatMap(g => (g.sectors || []).map(s => s.id)));
      const nameToSectorMap = {};
      for (const g of mergedGroups) {
        for (const s of g.sectors || []) {
          nameToSectorMap[`${g.id}::${s.name.toLowerCase()}`] = s.id;
          nameToSectorMap[`${g.name.toLowerCase()}::${s.name.toLowerCase()}`] = s.id;
        }
      }

      const healDesk = (d) => {
        let currentFloorId = d.floorId;
        if (!validSectorIds.has(currentFloorId)) {
          // Check if floorId contains hints or if name matches
          if (currentFloorId && currentFloorId.includes("higiene") && currentFloorId.includes("2do")) {
            currentFloorId = nameToSectorMap["higiene::2do piso"] || currentFloorId;
          } else if (currentFloorId && currentFloorId.includes("uspallata") && currentFloorId.includes("2do")) {
            currentFloorId = nameToSectorMap["uspallata::2do piso"] || currentFloorId;
          }
        }
        return {
          ...d,
          floorId: currentFloorId,
          assignedUsers: d.assignedUsers || (d.assignedUser ? [d.assignedUser] : [])
        };
      };

      if (fbDesks && fbDesks.length > 0) {
        const mergedDesks = fbDesks.map(healDesk);
        setDesks(mergedDesks);
        saveToStorage(STORAGE_KEY_DESKS, mergedDesks);
      } else if (snapshot.desks && snapshot.desks.length > 0) {
        const migrated = snapshot.desks.map(healDesk);
        setDesks(migrated);
        await saveDesks(migrated);
      } else {
        setDesks(INITIAL_DESKS);
        saveToStorage(STORAGE_KEY_DESKS, INITIAL_DESKS);
      }

      setFirebaseReady(true);
    })();
  }, []);

  // Push to undo history on desks change
  useEffect(() => {
    if (skipHistoryRef.current) {
      skipHistoryRef.current = false;
      return;
    }
    // Slice forward history (like a normal undo stack)
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push(JSON.stringify(desks));
    if (historyRef.current.length > MAX_HISTORY) {
      historyRef.current.shift();
    } else {
      historyIndexRef.current = historyRef.current.length - 1;
    }
  }, [desks]);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current -= 1;
    skipHistoryRef.current = true;
    setDesks(JSON.parse(historyRef.current[historyIndexRef.current]));
  }, []);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    skipHistoryRef.current = true;
    setDesks(JSON.parse(historyRef.current[historyIndexRef.current]));
  }, []);

  const [addMode, setAddMode] = useState(false);
  const [addType, setAddType] = useState("puesto");
  const [addQuantity, setAddQuantity] = useState(4);
  const [addRotation, setAddRotation] = useState(0);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      const isInput = e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA";
      if (isInput) return;
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault();
        handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
        e.preventDefault();
        handleRedo();
      }
      if (e.key === "Escape" && addMode) {
        setAddMode(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo, addMode]);

  const allSectors = groups.flatMap(g => g.sectors || []);
  const [activeSectorId, setActiveSectorId] = useState(allSectors[0]?.id || "");
  const [activeSubsectorId, setActiveSubsectorId] = useState(null);

  useEffect(() => {
    const all = groups.flatMap(g => g.sectors || []);
    if (all.length > 0 && (!activeSectorId || !all.some(s => s.id === activeSectorId))) {
      setActiveSectorId(all[0].id);
    }
  }, [groups, activeSectorId]);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDeskId, setSelectedDeskId] = useState(null);
  const [multiSelectedIds, setMultiSelectedIds] = useState([]);
  const [scrollToDeskId, setScrollToDeskId] = useState(null);

  // Independent debounce timers for each entity type
  const saveTimersRef = useRef({});

  const saveToFirebase = useCallback((type, data) => {
    if (saveTimersRef.current[type]) {
      clearTimeout(saveTimersRef.current[type]);
    }
    saveTimersRef.current[type] = setTimeout(() => {
      if (type === "groups") saveGroups(data);
      if (type === "desks") saveDesks(data);
      if (type === "labels") saveLabels(data);
      if (type === "employees") saveEmployees(data);
    }, 1500);
  }, []);

  // Save to localStorage AND Firebase only after initial load is complete
  useEffect(() => {
    if (!firebaseReady) return;
    saveToStorage(STORAGE_KEY_DESKS, desks);
    saveToFirebase("desks", desks);
  }, [desks, firebaseReady]);

  useEffect(() => {
    if (!firebaseReady) return;
    saveToStorage(STORAGE_KEY_GROUPS, groups);
    saveToFirebase("groups", groups);
  }, [groups, firebaseReady]);

  useEffect(() => {
    if (!firebaseReady) return;
    saveToStorage(STORAGE_KEY_EMPLOYEES, employees);
    saveToFirebase("employees", employees);
  }, [employees, firebaseReady]);

  useEffect(() => {
    if (!firebaseReady) return;
    saveToStorage(STORAGE_KEY_LABELS, labels);
    saveToFirebase("labels", labels);
  }, [labels, firebaseReady]);

  // Auth & Theme effects
  useEffect(() => {
    if (currentUser) saveToStorage(STORAGE_KEY_USER, currentUser);
    else localStorage.removeItem(STORAGE_KEY_USER);
  }, [currentUser]);

  useEffect(() => {
    saveToStorage(STORAGE_KEY_THEME, theme);
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Admin single-session lock: heartbeat & remote expulsion listener
  useEffect(() => {
    if (!currentUser || currentUser.role !== "admin") return;

    // If logged in without sessionId, generate one and claim it
    if (!currentUser.sessionId) {
      const generatedSessionId = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      claimAdminSession(generatedSessionId);
      setCurrentUser(prev => prev ? { ...prev, sessionId: generatedSessionId } : null);
      return;
    }

    const currentSessionId = currentUser.sessionId;

    // Send immediate ping & periodic heartbeat every 15s
    pingAdminSession(currentSessionId);
    const interval = setInterval(() => {
      pingAdminSession(currentSessionId);
    }, 15000);

    // Subscribe to remote session changes to detect if another admin takes over
    const unsubscribe = subscribeToAdminSession((sessionData) => {
      if (sessionData && sessionData.sessionId && sessionData.sessionId !== currentSessionId) {
        // Another admin logged in and claimed the session
        clearInterval(interval);
        setCurrentUser(null);
        localStorage.removeItem(STORAGE_KEY_USER);
        alert("Tu sesión de administrador ha sido cerrada porque se inició sesión desde otro dispositivo.");
      }
    });

    // Best-effort release on window unload
    const handleUnload = () => {
      releaseAdminSession(currentSessionId);
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      clearInterval(interval);
      unsubscribe();
      window.removeEventListener("beforeunload", handleUnload);
    };
  }, [currentUser?.role, currentUser?.sessionId]);

  // ─── Multi-search: split by comma (Name, User, Label) ──────────────────────
  const searchTerms = searchQuery
    ? searchQuery.split(",").map(t => t.trim().toLowerCase()).filter(Boolean)
    : [];

  const highlightedDeskIds = searchTerms.length > 0
    ? desks
        .filter(d =>
          searchTerms.some(q => {
            const matchName = d.name.toLowerCase().includes(q);
            const matchUser = d.assignedUsers && d.assignedUsers.some(u => u.toLowerCase().includes(q));
            const activeLabel = labels.find(l => l.id === d.labelId);
            const matchLabel = activeLabel && activeLabel.name.toLowerCase().includes(q);
            return matchName || matchUser || matchLabel;
          })
        )
        .map(d => d.id)
    : [];

  const searchResultCount = highlightedDeskIds.length;

  // ─── Desk Handlers ──────────────────────────────────────────────────────────
  const handleDeskClick = useCallback((desk, ctrlKey) => {
    if (ctrlKey) {
      setMultiSelectedIds(prev => {
        const idx = prev.indexOf(desk.id);
        if (idx >= 0) return prev.filter(id => id !== desk.id);
        return [...prev, desk.id];
      });
      return;
    }
    setMultiSelectedIds([]);
    setSelectedDeskId(prev => (prev === desk.id ? null : desk.id));
  }, []);

  const handleDeskMove = useCallback((deskId, newX, newY) => {
    setDesks(prev =>
      prev.map(d => (d.id === deskId ? { ...d, x: newX, y: newY } : d))
    );
  }, []);

  const handleAddDesks = useCallback((newDesks) => {
    setDesks(prev => [...prev, ...newDesks]);
    // Stay in addMode so the user can continuously place more elements
  }, []);

  const handleUpdateDesk = useCallback((updatedDesk) => {
    setDesks(prev => prev.map(d => (d.id === updatedDesk.id ? updatedDesk : d)));
  }, []);

  const handleDeleteDesk = useCallback((deskId) => {
    const target = desks.find(d => d.id === deskId);
    if (target?.locked) {
      alert("No se puede eliminar un puesto bloqueado.");
      return;
    }
    if (!window.confirm("¿Eliminar este elemento?")) return;
    deleteDesk(deskId);
    setDesks(prev => prev.filter(d => d.id !== deskId));
    setSelectedDeskId(null);
    setMultiSelectedIds(prev => prev.filter(id => id !== deskId));
  }, [desks]);

  const handleCloneDesk = useCallback((desk) => {
    const newId = `desk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const cloned = {
      ...desk,
      id: newId,
      x: desk.x + 30,
      y: desk.y + 30,
      locked: false,
      assignedUsers: [...(desk.assignedUsers || [])]
    };
    setDesks(prev => [...prev, cloned]);
    setSelectedDeskId(newId);
  }, []);

  const handleBatchLock = useCallback((lock) => {
    setDesks(prev =>
      prev.map(d =>
        multiSelectedIds.includes(d.id) ? { ...d, locked: lock } : d
      )
    );
  }, [multiSelectedIds]);

  const handleBatchDelete = useCallback(() => {
    const selectedDesks = desks.filter(d => multiSelectedIds.includes(d.id));
    const hasLocked = selectedDesks.some(d => d.locked);
    if (hasLocked) {
      alert("No se puede eliminar un puesto bloqueado.");
      return;
    }
    if (!window.confirm(`¿Estás seguro? Se eliminarán ${multiSelectedIds.length} elemento${multiSelectedIds.length !== 1 ? "s" : ""}.`)) return;
    for (const id of multiSelectedIds) deleteDesk(id);
    setDesks(prev => prev.filter(d => !multiSelectedIds.includes(d.id)));
    setMultiSelectedIds([]);
    setSelectedDeskId(null);
  }, [desks, multiSelectedIds]);

  const handleBatchLabel = useCallback((labelId) => {
    setDesks(prev =>
      prev.map(d =>
        multiSelectedIds.includes(d.id) ? { ...d, labelId: labelId ?? null } : d
      )
    );
  }, [multiSelectedIds]);

  // ─── Distribute uniformly ───────────────────────────────────────────────────
  const handleDistribute = useCallback((direction) => {
    if (multiSelectedIds.length < 2) return;
    setDesks(prev => {
      const selected = prev.filter(d => multiSelectedIds.includes(d.id));
      if (direction === "horizontal") {
        const sorted = [...selected].sort((a, b) => a.x - b.x);
        const first = sorted[0].x;
        const last = sorted[sorted.length - 1].x;
        const gap = (last - first) / (sorted.length - 1);
        const updates = {};
        sorted.forEach((d, i) => { updates[d.id] = { x: Math.round(first + i * gap) }; });
        return prev.map(d => updates[d.id] ? { ...d, ...updates[d.id] } : d);
      } else {
        const sorted = [...selected].sort((a, b) => a.y - b.y);
        const first = sorted[0].y;
        const last = sorted[sorted.length - 1].y;
        const gap = (last - first) / (sorted.length - 1);
        const updates = {};
        sorted.forEach((d, i) => { updates[d.id] = { y: Math.round(first + i * gap) }; });
        return prev.map(d => updates[d.id] ? { ...d, ...updates[d.id] } : d);
      }
    });
  }, [multiSelectedIds]);

  const handleSelectAll = useCallback(() => {
    setMultiSelectedIds(
      desks
        .filter(d => {
          if (d.floorId !== activeSectorId) return false;
          if (activeSubsectorId && d.sectorId !== activeSubsectorId) return false;
          return true;
        })
        .map(d => d.id)
    );
  }, [desks, activeSectorId, activeSubsectorId]);

  const handleSelectFromList = useCallback((deskId) => {
    const desk = desks.find(d => d.id === deskId);
    if (!desk) return;
    setMultiSelectedIds([]);
    setSelectedDeskId(deskId);
    setActiveSectorId(desk.floorId);
    setActiveSubsectorId(desk.sectorId);
    setSearchQuery("");
    setScrollToDeskId(deskId);
    setTimeout(() => setScrollToDeskId(null), 100);
  }, [desks]);

  // ─── Employees ──────────────────────────────────────────────────────────────
  const handleAddEmployee = useCallback((name) => {
    const id = generateId();
    setEmployees(prev => [...prev, { id, name }]);
  }, []);

  const handleDeleteEmployee = useCallback((id) => {
    setEmployees(prev => prev.filter(e => e.id !== id));
  }, []);

  // ─── Labels ─────────────────────────────────────────────────────────────────
  const handleAddLabel = useCallback((name, color) => {
    const id = generateId();
    setLabels(prev => [...prev, { id, name, color }]);
  }, []);

  const handleUpdateLabel = useCallback((id, name, color) => {
    setLabels(prev => prev.map(l => l.id === id ? { ...l, name, color } : l));
  }, []);

  const handleDeleteLabel = useCallback((id) => {
    setLabels(prev => prev.filter(l => l.id !== id));
    // Remove label from all desks that use it
    setDesks(prev => prev.map(d => d.labelId === id ? { ...d, labelId: null } : d));
  }, []);

  // ─── Group / Sector handlers ────────────────────────────────────────────────
  const handleAddGroup = useCallback((name) => {
    const id = generateId();
    setGroups(prev => [...prev, { id, name, sectors: [] }]);
  }, []);

  const handleUpdateGroup = useCallback((groupId, name) => {
    setGroups(prev => prev.map(g => g.id === groupId ? { ...g, name } : g));
  }, []);

  const handleDeleteGroup = useCallback((groupId) => {
    setGroups(prev => prev.filter(g => g.id !== groupId));
  }, []);

  const handleAddSector = useCallback((groupId, name) => {
    const id = generateId();
    setGroups(prev =>
      prev.map(g =>
        g.id === groupId
          ? { ...g, sectors: [...g.sectors, { id, name, subsectors: [] }] }
          : g
      )
    );
  }, []);

  const handleUpdateSector = useCallback((sectorId, name) => {
    setGroups(prev =>
      prev.map(g => ({
        ...g,
        sectors: g.sectors.map(s => s.id === sectorId ? { ...s, name } : s)
      }))
    );
  }, []);

  const handleDeleteSector = useCallback((sectorId) => {
    setDesks(prev => {
      const removed = prev.filter(d => d.floorId === sectorId);
      for (const d of removed) deleteDesk(d.id);
      return prev.filter(d => d.floorId !== sectorId);
    });
    setGroups(prev => {
      const next = prev.map(g => ({ ...g, sectors: g.sectors.filter(s => s.id !== sectorId) }));
      saveGroups(next);
      return next;
    });
    if (activeSectorId === sectorId) {
      const all = groups.flatMap(g => g.sectors).filter(s => s.id !== sectorId);
      if (all.length > 0) setActiveSectorId(all[0].id);
      setActiveSubsectorId(null);
    }
  }, [groups, activeSectorId]);

  const handleAddSubsector = useCallback((sectorId, name) => {
    const id = generateId();
    setGroups(prev =>
      prev.map(g => ({
        ...g,
        sectors: g.sectors.map(s =>
          s.id === sectorId
            ? { ...s, subsectors: [...s.subsectors, { id, name }] }
            : s
        )
      }))
    );
  }, []);

  const handleUpdateSubsector = useCallback((sectorId, subsectorId, name) => {
    setGroups(prev =>
      prev.map(g => ({
        ...g,
        sectors: g.sectors.map(s =>
          s.id === sectorId
            ? { ...s, subsectors: s.subsectors.map(c => c.id === subsectorId ? { ...c, name } : c) }
            : s
        )
      }))
    );
  }, []);

  const handleDeleteSubsector = useCallback((sectorId, subsectorId) => {
    setDesks(prev => {
      const removed = prev.filter(d => d.floorId === sectorId && d.sectorId === subsectorId);
      for (const d of removed) deleteDesk(d.id);
      return prev.filter(d => !(d.floorId === sectorId && d.sectorId === subsectorId));
    });
    setGroups(prev => {
      const next = prev.map(g => ({
        ...g,
        sectors: g.sectors.map(s =>
          s.id === sectorId
            ? { ...s, subsectors: s.subsectors.filter(c => c.id !== subsectorId) }
            : s
        )
      }));
      saveGroups(next);
      return next;
    });
    if (activeSubsectorId === subsectorId) setActiveSubsectorId(null);
  }, [activeSubsectorId]);

  const handleMoveSubsector = useCallback((sectorId, subsectorId, direction) => {
    setGroups(prev =>
      prev.map(g => ({
        ...g,
        sectors: g.sectors.map(s => {
          if (s.id !== sectorId) return s;
          const idx = s.subsectors.findIndex(c => c.id === subsectorId);
          if (idx === -1) return s;
          const newIdx = idx + direction;
          if (newIdx < 0 || newIdx >= s.subsectors.length) return s;
          const subsectors = [...s.subsectors];
          [subsectors[idx], subsectors[newIdx]] = [subsectors[newIdx], subsectors[idx]];
          return { ...s, subsectors };
        })
      }))
    );
  }, []);

  const handleMoveSector = useCallback((groupId, sectorId, direction) => {
    setGroups(prev =>
      prev.map(g => {
        if (g.id !== groupId) return g;
        const idx = g.sectors.findIndex(s => s.id === sectorId);
        if (idx === -1) return g;
        const newIdx = idx + direction;
        if (newIdx < 0 || newIdx >= g.sectors.length) return g;
        const sectors = [...g.sectors];
        [sectors[idx], sectors[newIdx]] = [sectors[newIdx], sectors[idx]];
        return { ...g, sectors };
      })
    );
  }, []);

  // ─── Export ────────────────────────────────────────────────────────────────
  const gridCanvasRef = useRef(null);

  const handleExportCSV = useCallback(() => {
    const headers = ["id", "name", "type", "x", "y", "w", "h", "rotation", "floorId", "sectorId", "assignedUsers", "labelId", "locked"];
    const rows = desks.map(d => [
      d.id, d.name, d.type, d.x, d.y, d.w || "", d.h || "", d.rotation || 0,
      d.floorId, d.sectorId || "", (d.assignedUsers || []).join(";"), d.labelId || "", d.locked ? "1" : "0"
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `mapa-puestos-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [desks]);

  // ─── Computed ───────────────────────────────────────────────────────────────
  const selectedDesk = desks.find(d => d.id === selectedDeskId) || null;

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');
  const handleLogout = useCallback(() => {
    if (currentUser?.role === "admin" && currentUser?.sessionId) {
      releaseAdminSession(currentUser.sessionId);
    }
    setCurrentUser(null);
    localStorage.removeItem(STORAGE_KEY_USER);
  }, [currentUser]);

  if (!currentUser) {
    return <Login onLogin={setCurrentUser} />;
  }

  const visibleDesks = desks.filter(d => {
    if (d.floorId !== activeSectorId) return false;
    if (activeSubsectorId && d.sectorId !== activeSubsectorId) return false;
    return true;
  });

  const sidebarDesks = searchQuery ? desks : visibleDesks;

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="logo-icon-container">
            <LayoutGrid size={24} />
          </div>
          <div>
            <h1 className="header-title">Mapa de Puestos</h1>
            <p className="header-subtitle">Herramienta de Soporte IT</p>
          </div>
        </div>
        <div style={{ flex: 1, maxWidth: "600px", margin: "0 24px", position: "relative" }}>
          <Search className="search-icon" size={20} />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar puestos, usuarios o etiquetas (separar con coma)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <span className="search-results-count">
              {searchResultCount} resultado{searchResultCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {/* Undo / Redo buttons (admin only) */}
          {isAdmin && (
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                onClick={handleUndo}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", padding: "6px" }}
                title="Deshacer (Ctrl+Z)"
              >
                <Undo2 size={18} />
              </button>
              <button
                onClick={handleRedo}
                style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-secondary)", padding: "6px" }}
                title="Rehacer (Ctrl+Y)"
              >
                <Redo2 size={18} />
              </button>
            </div>
          )}

          <button
            onClick={toggleTheme}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-text-secondary)" }}
            title={theme === 'light' ? "Cambiar a modo oscuro" : "Cambiar a modo claro"}
          >
            {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          </button>

          <button
            onClick={handleLogout}
            style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-accent-red)", display: "flex", alignItems: "center", gap: "8px" }}
            title="Cerrar Sesión"
          >
            <LogOut size={20} />
            <span style={{ fontWeight: 600, fontSize: "14px" }}>Salir</span>
          </button>
        </div>
      </header>

      <div className="main-content">
        <Sidebar
          groups={groups}
          activeSectorId={activeSectorId}
          activeSubsectorId={activeSubsectorId}
          onSectorChange={setActiveSectorId}
          onSubsectorChange={setActiveSubsectorId}
          desks={sidebarDesks}
          selectedDeskId={selectedDeskId}
          multiSelectedIds={multiSelectedIds}
          searchQuery={searchQuery}
          addMode={addMode}
          addType={addType}
          addQuantity={addQuantity}
          addRotation={addRotation}
          onSelectDesk={handleSelectFromList}
          onStartAdd={() => setAddMode(true)}
          onCancelAdd={() => setAddMode(false)}
          onChangeAddType={(t) => { setAddType(t); if (t !== "puesto" && t !== "linea") setAddRotation(0); }}
          onChangeAddQuantity={setAddQuantity}
          onChangeAddRotation={setAddRotation}
          onAddGroup={handleAddGroup}
          onUpdateGroup={handleUpdateGroup}
          onDeleteGroup={handleDeleteGroup}
          onAddSector={handleAddSector}
          onUpdateSector={handleUpdateSector}
          onDeleteSector={handleDeleteSector}
          onAddSubsector={handleAddSubsector}
          onUpdateSubsector={handleUpdateSubsector}
          onDeleteSubsector={handleDeleteSubsector}
          onMoveSubsector={handleMoveSubsector}
          onMoveSector={handleMoveSector}
          onDeleteDesk={handleDeleteDesk}
          onBatchLock={handleBatchLock}
          onBatchDelete={handleBatchDelete}
          onBatchLabel={handleBatchLabel}
          onSelectAll={handleSelectAll}
          isAdmin={isAdmin}
          employees={employees}
          onAddEmployee={handleAddEmployee}
          onDeleteEmployee={handleDeleteEmployee}
          labels={labels}
          onAddLabel={handleAddLabel}
          onUpdateLabel={handleUpdateLabel}
          onDeleteLabel={handleDeleteLabel}
        />

        <div style={{ flex: 1, position: "relative", overflow: "hidden", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <GridMap
            desks={visibleDesks}
            selectedDeskId={selectedDeskId}
            multiSelectedIds={multiSelectedIds}
            highlightedDeskIds={highlightedDeskIds}
            addMode={addMode}
            addType={addType}
            addQuantity={addQuantity}
            addRotation={addRotation}
            floorId={activeSectorId}
            categoryId={activeSubsectorId}
            onDeskClick={handleDeskClick}
            onDeskMove={handleDeskMove}
            onAddDesks={handleAddDesks}
            scrollToDeskId={scrollToDeskId}
            isAdmin={isAdmin}
            labels={labels}
            canvasRef={gridCanvasRef}
          />

          {selectedDesk && multiSelectedIds.length === 0 && (
            <DeskDetails
              key={selectedDesk.id}
              desk={selectedDesk}
              groups={groups}
              onClose={() => setSelectedDeskId(null)}
              onUpdate={handleUpdateDesk}
              onDelete={handleDeleteDesk}
              onClone={isAdmin ? handleCloneDesk : undefined}
              isAdmin={isAdmin}
              employees={employees}
              labels={labels}
            />
          )}

          {multiSelectedIds.length > 0 && (
            <BatchActions
              count={multiSelectedIds.length}
              onSelectAll={handleSelectAll}
              onLock={() => handleBatchLock(true)}
              onUnlock={() => handleBatchLock(false)}
              onDelete={handleBatchDelete}
              onClear={() => setMultiSelectedIds([])}
              onDistribute={isAdmin ? handleDistribute : undefined}
              labels={labels}
              onBatchLabel={isAdmin ? handleBatchLabel : undefined}
            />
          )}
        </div>
      </div>
    </div>
  );
}
