import React, { useState, useRef, useEffect, useCallback } from "react";
import { ZoomIn, ZoomOut } from "lucide-react";
import DeskItem from "./DeskItem";

const GRID_SIZE = 20; // snap to 20px grid
const CANVAS_WIDTH = 3000;
const CANVAS_HEIGHT = 2000;

function snapToGrid(val) {
  return Math.round(val / GRID_SIZE) * GRID_SIZE;
}

export default function GridMap({
  desks,
  selectedDeskId,
  multiSelectedIds,
  highlightedDeskIds,
  addMode,
  addType,
  addQuantity,
  addRotation,
  floorId,
  categoryId,
  onDeskClick,
  onDeskMove,
  onAddDesks,
  scrollToDeskId,
  isAdmin,
  labels = []
}) {
  const viewportRef = useRef(null);
  const canvasRef = useRef(null);

  const dragRef = useRef({
    active: false,
    deskIds: [],
    startMouseX: 0,
    startMouseY: 0,
    startDesks: [],
    moved: false
  });

  // Ghost preview position for add mode
  const [ghostPos, setGhostPos] = useState(null);
  const [scale, setScale] = useState(1);

  // Keyboard navigation for panning
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if typing in an input
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      
      const viewport = viewportRef.current;
      if (!viewport) return;

      const SCROLL_STEP = 50;
      switch (e.key) {
        case "ArrowUp":
          e.preventDefault();
          viewport.scrollTop -= SCROLL_STEP;
          break;
        case "ArrowDown":
          e.preventDefault();
          viewport.scrollTop += SCROLL_STEP;
          break;
        case "ArrowLeft":
          e.preventDefault();
          viewport.scrollLeft -= SCROLL_STEP;
          break;
        case "ArrowRight":
          e.preventDefault();
          viewport.scrollLeft += SCROLL_STEP;
          break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Update ghost position on mouse move over canvas
  const handleCanvasMouseMove = useCallback((e) => {
    if (!addMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const rawX = e.clientX - rect.left;
    const rawY = e.clientY - rect.top;
    const x = snapToGrid(rawX);
    const y = snapToGrid(rawY);
    setGhostPos({ x, y });
  }, [addMode]);

  const handleCanvasMouseLeave = useCallback(() => {
    if (addMode) setGhostPos(null);
  }, [addMode]);

  // Click on canvas in add mode places desks
  const handleCanvasClick = useCallback((e) => {
    if (!addMode || !ghostPos) return;
    e.stopPropagation();

    const isSalon = addType === "salon";
    const isLinea = addType === "linea";
    const isEscalera = addType === "escalera";

    let deskW = 80;
    let deskH = 40;
    if (addType === "impresora") deskW = 60;
    else if (addType === "director") deskW = 100;
    else if (isSalon) { deskW = 400; deskH = 300; }
    else if (isLinea) { deskW = 200; deskH = 4; }
    else if (isEscalera) { deskW = 100; deskH = 100; }

    const gap = 8;
    const newDesks = [];

    for (let i = 0; i < addQuantity; i++) {
      const timestamp = Date.now();
      let prefix = "P";
      let defaultName = `P-`;
      
      if (addType === "impresora") { prefix = "PRN"; defaultName = "Impresora"; }
      else if (addType === "director") { prefix = "DIR"; defaultName = "Director"; }
      else if (isSalon) { prefix = "SAL"; defaultName = "Salón"; }
      else if (isLinea) { prefix = "LIN"; defaultName = ""; }
      else if (isEscalera) { prefix = "ESC"; defaultName = "Escalera"; }
      
      const idNum = Math.floor(Math.random() * 9000) + 1000;
      if (["puesto", "director"].includes(addType)) defaultName += idNum;

      const isRotated = addRotation === 90 || addRotation === 270;

      newDesks.push({
        id: `${prefix}-${idNum}-${timestamp}-${i}`,
        name: defaultName,
        type: addType,
        floorId,
        sectorId: categoryId || null,
        x: isRotated ? ghostPos.x : ghostPos.x + i * (deskW + gap),
        y: isRotated ? ghostPos.y + i * (deskW + gap) : ghostPos.y,
        w: deskW,
        h: deskH,
        rotation: addRotation || 0,
        locked: false,
        assignedUser: null,
        assignedUsers: []
      });
    }
    onAddDesks(newDesks);
  }, [addMode, ghostPos, addType, addQuantity, addRotation, floorId, categoryId, onAddDesks]);

  // ---- Desk drag handlers ----
  const handleDeskMouseDown = useCallback((e, deskId) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isAdmin) return;
    const desk = desks.find(d => d.id === deskId);
    if (!desk || desk.locked) return;

    // Determine which desks to drag together
    let targetIds;
    if (multiSelectedIds && multiSelectedIds.includes(deskId)) {
      // Drag all unlocked multi-selected desks
      targetIds = multiSelectedIds.filter(id => {
        const d = desks.find(dd => dd.id === id);
        return d && !d.locked;
      });
    } else {
      targetIds = [deskId];
    }

    const startDesks = targetIds.map(id => {
      const d = desks.find(dd => dd.id === id);
      return d ? { id: d.id, x: d.x, y: d.y } : null;
    }).filter(Boolean);

    if (startDesks.length === 0) return;

    dragRef.current = {
      active: true,
      deskIds: targetIds,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      startDesks,
      moved: false
    };
  }, [desks, multiSelectedIds]);

  useEffect(() => {
    const handleGlobalMouseMove = (e) => {
      const drag = dragRef.current;
      if (!drag.active) return;

      const dx = e.clientX - drag.startMouseX;
      const dy = e.clientY - drag.startMouseY;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
        drag.moved = true;
      }
      if (!drag.moved) return;

      for (const sd of drag.startDesks) {
        const newX = snapToGrid(sd.x + dx);
        const newY = snapToGrid(sd.y + dy);
        onDeskMove(sd.id, newX, newY);
      }
    };

    const handleGlobalMouseUp = (e) => {
      const drag = dragRef.current;
      if (!drag.active) return;

      if (drag.moved) {
        const dx = e.clientX - drag.startMouseX;
        const dy = e.clientY - drag.startMouseY;
        for (const sd of drag.startDesks) {
          const newX = snapToGrid(sd.x + dx);
          const newY = snapToGrid(sd.y + dy);
          onDeskMove(sd.id, newX, newY);
        }
      }

      dragRef.current = { active: false, deskIds: [], startDesks: [], moved: false };
    };

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [onDeskMove]);

  // Reset viewport scroll to top-left when changing floor/sector or category
  useEffect(() => {
    if (viewportRef.current) {
      viewportRef.current.scrollTo({
        left: 0,
        top: 0,
        behavior: "instant"
      });
    }
  }, [floorId, categoryId]);

  // Scroll to desk and zoom in smoothly when scrollToDeskId changes
  useEffect(() => {
    if (!scrollToDeskId || !viewportRef.current) return;
    const desk = desks.find(d => d.id === scrollToDeskId);
    if (!desk) return;

    const targetScale = scale < 1 ? 1.2 : scale;
    if (scale !== targetScale) {
      setScale(targetScale);
    }

    const viewport = viewportRef.current;
    const deskW = desk.w || (desk.type === "director" ? 100 : desk.type === "impresora" ? 60 : 80);
    const deskH = desk.h || 40;

    const targetX = (desk.x + deskW / 2) * targetScale - viewport.clientWidth / 2;
    const targetY = (desk.y + deskH / 2) * targetScale - viewport.clientHeight / 2;

    viewport.scrollTo({
      left: Math.max(0, targetX),
      top: Math.max(0, targetY),
      behavior: "smooth"
    });
  }, [scrollToDeskId, desks, scale]);

  // Render ghost blocks
  const renderGhost = () => {
    if (!addMode || !ghostPos) return null;
    const baseW = addType === "impresora" ? 60 : addType === "director" ? 100 : 80;
    const baseH = 40;
    const isRotated = addRotation === 90 || addRotation === 270;
    const gap = 8;

    return Array.from({ length: addQuantity }, (_, i) => (
      <div
        key={i}
        className="ghost-preview"
        style={{
          left: isRotated ? ghostPos.x : ghostPos.x + i * (baseW + gap),
          top: isRotated ? ghostPos.y + i * (baseW + gap) : ghostPos.y,
          width: baseW,
          height: baseH,
          transform: addRotation ? `rotate(${addRotation}deg)` : undefined
        }}
      >
        +
      </div>
    ));
  };

  return (
    <div className="grid-map-container" style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", position: "relative", overflow: "hidden", minHeight: 0 }}>
      <div
        ref={viewportRef}
        className="grid-viewport"
        style={{ flex: 1, width: "100%", overflow: "auto", position: "relative", minHeight: 0 }}
      >
        <div
          ref={canvasRef}
          className="grid-canvas"
          style={{
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
          cursor: addMode ? "crosshair" : undefined,
          transform: `scale(${scale})`,
          transition: "transform 0.2s ease-out"
        }}
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={handleCanvasMouseLeave}
        onClick={handleCanvasClick}
      >
        {/* Render Desks */}
        {desks.map(desk => (
          <DeskItem
            key={desk.id}
            desk={desk}
            selected={selectedDeskId === desk.id}
            multiSelected={multiSelectedIds && multiSelectedIds.includes(desk.id)}
            highlighted={highlightedDeskIds && highlightedDeskIds.includes(desk.id)}
            isAdmin={isAdmin}
            labels={labels}
            onMouseDown={handleDeskMouseDown}
            onClick={(e, d) => {
              if (dragRef.current.moved) return;
              if (!addMode) onDeskClick(d, e.ctrlKey || e.metaKey);
            }}
          />
        ))}

        {/* Ghost preview */}
        {renderGhost()}
      </div>
    </div>

      {/* Zoom controls */}
      <div className="zoom-controls">
        <button onClick={() => setScale(s => Math.min(s + 0.1, 2))} title="Acercar">
          <ZoomIn size={18} />
        </button>
        <button onClick={() => setScale(1)} title="Restablecer" className="zoom-level">
          {Math.round(scale * 100)}%
        </button>
        <button onClick={() => setScale(s => Math.max(s - 0.1, 0.3))} title="Alejar">
          <ZoomOut size={18} />
        </button>
      </div>
    </div>
  );
}
