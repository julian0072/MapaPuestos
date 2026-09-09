import React, { useState, useEffect } from "react";
import {
  Plus,
  Minus,
  X,
  Monitor,
  Printer,
  Briefcase,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Pencil,
  Trash2,
  Lock,
  Unlock,
  CheckSquare,
  Square,
  Minus as LineIcon,
  AlignJustify,
  RotateCw,
  Users,
  Tag
} from "lucide-react";

export default function Sidebar({
  groups,
  activeSectorId,
  activeSubsectorId,
  onSectorChange,
  onSubsectorChange,
  desks,
  selectedDeskId,
  multiSelectedIds,
  searchQuery,
  addMode,
  addType,
  addQuantity,
  addRotation,
  onSelectDesk,
  onStartAdd,
  onCancelAdd,
  onChangeAddType,
  onChangeAddQuantity,
  onChangeAddRotation,
  onAddGroup,
  onUpdateGroup,
  onDeleteGroup,
  onAddSector,
  onUpdateSector,
  onDeleteSector,
  onAddSubsector,
  onUpdateSubsector,
  onDeleteSubsector,
  onMoveSubsector,
  onMoveSector,
  onDeleteDesk,
  onBatchLock,
  onBatchDelete,
  onBatchLabel,
  onSelectAll,
  isAdmin,
  employees = [],
  onAddEmployee,
  onDeleteEmployee,
  labels = [],
  onAddLabel,
  onUpdateLabel,
  onDeleteLabel
}) {
  const [expandedGroups, setExpandedGroups] = useState(() =>
    Object.fromEntries(groups.map(g => [g.id, true]))
  );
  const [showLabels, setShowLabels] = useState(false);
  const [showUsuarios, setShowUsuarios] = useState(true);
  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newLabelName, setNewLabelName] = useState("");
  const [newLabelColor, setNewLabelColor] = useState("#3b82f6");

  useEffect(() => {
    setExpandedGroups(prev => {
      const next = { ...prev };
      for (const g of groups) {
        if (!(g.id in next)) next[g.id] = true;
      }
      return next;
    });
  }, [groups]);

  const toggleGroup = (id) => {
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const activeSector = groups.flatMap(g => g.sectors).find(s => s.id === activeSectorId);

  const filteredDesks = desks.filter(d => {
    if (searchQuery) {
      const terms = searchQuery.split(",").map(t => t.trim().toLowerCase()).filter(Boolean);
      return terms.some(q => {
        const matchName = d.name.toLowerCase().includes(q);
        const matchUser = d.assignedUsers?.some(u => u.toLowerCase().includes(q));
        const activeLabel = labels?.find(l => l.id === d.labelId);
        const matchLabel = activeLabel && activeLabel.name.toLowerCase().includes(q);
        return matchName || matchUser || matchLabel;
      });
    }
    return true;
  });

  const handleAddGroupClick = () => {
    const name = window.prompt("Nombre del nuevo grupo:");
    if (name?.trim()) onAddGroup(name.trim());
  };

  const handleRenameGroup = (g) => {
    const name = window.prompt("Renombrar grupo:", g.name);
    if (name?.trim() && name.trim() !== g.name) onUpdateGroup(g.id, name.trim());
  };

  const handleDeleteGroupClick = (g) => {
    if (window.confirm(`¿Eliminar el grupo "${g.name}" y todos sus sectores?`)) {
      onDeleteGroup(g.id);
    }
  };

  const handleAddSectorClick = (groupId) => {
    const name = window.prompt("Nombre del nuevo sector:");
    if (name?.trim()) onAddSector(groupId, name.trim());
  };

  const handleRenameSector = (sector) => {
    const name = window.prompt("Renombrar sector:", sector.name);
    if (name?.trim() && name.trim() !== sector.name) onUpdateSector(sector.id, name.trim());
  };

  const handleDeleteSectorClick = (sector) => {
    if (window.confirm(`¿Eliminar el sector "${sector.name}"? También se eliminarán los puestos en este sector.`)) {
      onDeleteSector(sector.id);
    }
  };

  const handleAddSubsectorClick = () => {
    if (!activeSectorId) return;
    const name = window.prompt("Nombre del nuevo subsector:");
    if (name?.trim()) onAddSubsector(activeSectorId, name.trim());
  };

  const handleRenameSubsector = (sub) => {
    if (!activeSectorId) return;
    const name = window.prompt("Renombrar subsector:", sub.name);
    if (name?.trim() && name.trim() !== sub.name) onUpdateSubsector(activeSectorId, sub.id, name.trim());
  };

  const handleDeleteSubsectorClick = (sub) => {
    if (!activeSectorId) return;
    if (window.confirm(`¿Eliminar el subsector "${sub.name}"? También se eliminarán los puestos en este subsector.`)) {
      onDeleteSubsector(activeSectorId, sub.id);
    }
  };

  const getLocationLabel = (desk) => {
    for (const g of groups) {
      for (const s of g.sectors) {
        if (s.id === desk.floorId) {
          const sub = s.subsectors.find(c => c.id === desk.sectorId);
          return [g.name, s.name, sub?.name].filter(Boolean).join(" / ");
        }
      }
    }
    return "";
  };

  return (
    <div className="sidebar">
      {/* Grupos y Sectores */}
      <div className="sidebar-section">
        <div className="sidebar-section-header">
          <div className="sidebar-title" style={{ marginBottom: 0 }}>Sectores</div>
          {isAdmin && (
            <button className="btn-icon" onClick={handleAddGroupClick} title="Agregar grupo">
              <Plus size={14} />
            </button>
          )}
        </div>
        {groups.map(group => (
          <div key={group.id} className="group-container">
            <div
              className="group-header"
              onClick={() => toggleGroup(group.id)}
            >
              <span className="group-chevron">
                {expandedGroups[group.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
              <span className="group-name">{group.name}</span>
              {isAdmin && (
                <div className="pill-actions">
                  <button className="btn-icon btn-icon-sm" onClick={(e) => { e.stopPropagation(); handleRenameGroup(group); }} title="Renombrar">
                    <Pencil size={10} />
                  </button>
                  <button className="btn-icon btn-icon-sm btn-icon-danger" onClick={(e) => { e.stopPropagation(); handleDeleteGroupClick(group); }} title="Eliminar">
                    <Trash2 size={10} />
                  </button>
                </div>
              )}
            </div>
            {expandedGroups[group.id] && (
              <div className="sectors-in-group">
                {group.sectors.length === 0 && (
                  <div className="empty-hint">Sin sectores</div>
                )}
                {group.sectors.map(sector => (
                  <div key={sector.id} className="floor-pill-wrapper">
                    <button
                      id={`sector-${sector.id}`}
                      className={`floor-pill ${activeSectorId === sector.id ? "active" : "inactive"}`}
                      onClick={() => {
                        onSectorChange(sector.id);
                        onSubsectorChange(null);
                      }}
                    >
                      {sector.name}
                    </button>
                    {isAdmin && (
                      <div className="pill-actions">
                        <button className="btn-icon btn-icon-sm" onClick={() => onMoveSector(group.id, sector.id, -1)} title="Mover arriba">
                          <ChevronUp size={10} />
                        </button>
                        <button className="btn-icon btn-icon-sm" onClick={() => onMoveSector(group.id, sector.id, 1)} title="Mover abajo">
                          <ChevronDown size={10} />
                        </button>
                        <button className="btn-icon btn-icon-sm" onClick={() => handleRenameSector(sector)} title="Renombrar">
                          <Pencil size={10} />
                        </button>
                        <button className="btn-icon btn-icon-sm btn-icon-danger" onClick={() => handleDeleteSectorClick(sector)} title="Eliminar">
                          <Trash2 size={10} />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {isAdmin && (
                  <button className="btn-add-inline" onClick={() => handleAddSectorClick(group.id)}>
                    <Plus size={12} /> Agregar sector
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Etiquetas Personalizadas */}
      <div className="sidebar-section">
        <div className="sidebar-section-header" onClick={() => setShowLabels(!showLabels)} style={{ cursor: "pointer" }}>
          <div className="sidebar-title" style={{ marginBottom: 0, display: "flex", alignItems: "center", gap: "6px" }}>
            <Tag size={14} /> Etiquetas ({labels.length})
          </div>
          <span className="group-chevron">
            {showLabels ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        </div>
        {showLabels && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
            {labels.map(lbl => (
              <div key={lbl.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "12px", background: "var(--color-bg-main)", padding: "6px 10px", borderRadius: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: lbl.color }} />
                  <span style={{ fontWeight: 600 }}>{lbl.name}</span>
                </div>
                {isAdmin && (
                  <button className="btn-icon btn-icon-sm btn-icon-danger" onClick={(e) => { e.stopPropagation(); onDeleteLabel(lbl.id); }} title="Eliminar etiqueta">
                    <Trash2 size={10} />
                  </button>
                )}
              </div>
            ))}
            {isAdmin && (
              <form onSubmit={(e) => { e.preventDefault(); if (newLabelName.trim()) { onAddLabel(newLabelName.trim(), newLabelColor); setNewLabelName(""); } }} style={{ display: "flex", gap: "4px", marginTop: "4px" }}>
                <input
                  type="color"
                  value={newLabelColor}
                  onChange={e => setNewLabelColor(e.target.value)}
                  style={{ width: "28px", height: "28px", border: "none", borderRadius: "6px", cursor: "pointer", padding: 0 }}
                  title="Elegir color"
                />
                <input
                  className="edit-input"
                  style={{ padding: "4px 8px", fontSize: "12px", flex: 1 }}
                  placeholder="Nueva etiqueta..."
                  value={newLabelName}
                  onChange={e => setNewLabelName(e.target.value)}
                />
                <button type="submit" className="btn-add-user" style={{ padding: "4px 10px", fontSize: "12px" }}>+</button>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Usuarios / Desks List */}
      <div className="sidebar-section">
        <div
          className="sidebar-section-header"
          onClick={() => setShowUsuarios(v => !v)}
          style={{ cursor: "pointer", userSelect: "none" }}
        >
          <div className="sidebar-title" style={{ marginBottom: 0 }}>
            Usuarios ({filteredDesks.length})
          </div>
          <span className="group-chevron">
            {showUsuarios ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        </div>
        {showUsuarios && (
          <div className="users-list" id="users-list" style={{ marginTop: "12px" }}>
            {filteredDesks.length === 0 && (
              <div style={{ color: "var(--color-text-light)", fontSize: 13, padding: "12px 0" }}>
                No hay puestos en este sector.
              </div>
            )}
            {filteredDesks.map(desk => {
              const initial = desk.name.slice(0, 2).toUpperCase();
              const loc = getLocationLabel(desk);
              return (
                <div
                  key={desk.id}
                  id={`user-item-${desk.id}`}
                  className={`user-list-item ${selectedDeskId === desk.id ? "selected" : ""}`}
                  onClick={() => onSelectDesk(desk.id)}
                >
                  <div className="user-item-avatar">{initial}</div>
                  <div className="user-item-info">
                    <span className="user-item-name">{desk.name}</span>
                    <span className="user-item-assignment">
                      {desk.assignedUsers?.length > 0 ? `${desk.assignedUsers.join(", ")}${searchQuery ? ` — ${loc}` : ""}` : `Sin asignar${searchQuery ? ` — ${loc}` : ""}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Botón agregar - siempre visible al final del sidebar para admin */}
      {isAdmin && !addMode && multiSelectedIds.length === 0 && (
        <div style={{ padding: "16px 20px", borderTop: "1px solid var(--color-border)", marginTop: "auto", position: "sticky", bottom: 0, backgroundColor: "var(--color-bg-sidebar)", zIndex: 10 }}>
          <button
            id="add-desk-btn"
            className="btn-add-desk"
            onClick={onStartAdd}
          >
            <Plus size={18} />
            Agregar elemento
          </button>
          {selectedDeskId && onDeleteDesk && (
            <button
              className="btn-delete btn-delete-fullwidth"
              style={{ marginTop: "8px" }}
              onClick={() => onDeleteDesk(selectedDeskId)}
              title="Eliminar elemento"
            >
              <Trash2 size={14} />
              Eliminar elemento
            </button>
          )}
        </div>
      )}

      {/* Bottom section - creation flow */}
      {isAdmin && addMode && (
        <div className="creation-panel" style={{ position: "sticky", bottom: 0, zIndex: 10 }}>
              <div>
                <div className="creation-label">Tipo de objeto</div>
                <div className="type-buttons">
                  <button
                    className={`type-btn ${addType === "puesto" ? "active" : ""}`}
                    onClick={() => onChangeAddType("puesto")}
                  >
                    <Monitor size={18} /> PUESTO
                  </button>
                  <button
                    className={`type-btn ${addType === "impresora" ? "active" : ""}`}
                    onClick={() => onChangeAddType("impresora")}
                  >
                    <Printer size={18} /> IMPRESORA
                  </button>
                  <button
                    className={`type-btn ${addType === "director" ? "active" : ""}`}
                    onClick={() => onChangeAddType("director")}
                  >
                    <Briefcase size={18} /> DIRECTOR
                  </button>
                  <button
                    className={`type-btn ${addType === "salon" ? "active" : ""}`}
                    onClick={() => onChangeAddType("salon")}
                  >
                    <Square size={18} /> SALÓN
                  </button>
                  <button
                    className={`type-btn ${addType === "linea" ? "active" : ""}`}
                    onClick={() => onChangeAddType("linea")}
                  >
                    <LineIcon size={18} /> LÍNEA
                  </button>
                  <button
                    className={`type-btn ${addType === "escalera" ? "active" : ""}`}
                    onClick={() => onChangeAddType("escalera")}
                  >
                    <AlignJustify size={18} /> ESCALERA
                  </button>
                </div>
              </div>
              <div>
                <div className="creation-label">Cantidad de objetos</div>
                <div className="quantity-control">
                  <button
                    className="qty-btn"
                    onClick={() => onChangeAddQuantity(Math.max(1, addQuantity - 1))}
                  >
                    <Minus size={14} />
                  </button>
                  <span className="qty-val">{addQuantity}</span>
                  <button
                    className="qty-btn"
                    onClick={() => onChangeAddQuantity(Math.min(12, addQuantity + 1))}
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              {(addType === "puesto" || addType === "linea") && (
                <div>
                  <div className="creation-label">Orientación</div>
                  <div className="type-buttons">
                    <button
                      className={`type-btn ${addRotation === 0 ? "active" : ""}`}
                      onClick={() => onChangeAddRotation(0)}
                    >
                      {addType === "linea" ? <LineIcon size={18} /> : <Monitor size={18} />} Horizontal
                    </button>
                    <button
                      className={`type-btn ${addRotation === 270 ? "active" : ""}`}
                      onClick={() => onChangeAddRotation(270)}
                    >
                      <RotateCw size={18} /> Vertical
                    </button>
                  </div>
                </div>
              )}
              <button
                id="cancel-add-btn"
                className="btn-cancel"
                onClick={onCancelAdd}
              >
                <X size={16} />
                Cancelar
              </button>
            </div>
      )}
    </div>
  );
}
