import React, { useState, useRef } from "react";
import {
  X,
  Lock,
  Unlock,
  Pencil,
  Trash2,
  Check,
  MapPin,
  RotateCw,
  Copy,
  Tag,
  UserPlus,
  StickyNote
} from "lucide-react";

export default function DeskDetails({
  desk,
  groups,
  onClose,
  onUpdate,
  onDelete,
  onClone,
  isAdmin,
  employees = [],
  labels = []
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(desk.name);
  const [editW, setEditW] = useState(desk.w || "");
  const [editH, setEditH] = useState(desk.h || "");
  const [editUsers, setEditUsers] = useState(desk.assignedUsers ? [...desk.assignedUsers] : []);
  const [newUserName, setNewUserName] = useState("");
  const [editLabelId, setEditLabelId] = useState(desk.labelId || "");
  const [editNotes, setEditNotes] = useState(desk.notes || "");
  const [editingUserIndex, setEditingUserIndex] = useState(null);
  const [editingUserValue, setEditingUserValue] = useState("");
  const editUserInputRef = useRef(null);

  const allSectors = groups.flatMap(g => g.sectors);
  const sector = allSectors.find(s => s.id === desk.floorId);
  const subsector = sector?.subsectors?.find(c => c.id === desk.sectorId);
  const group = groups.find(g => g.sectors.some(s => s.id === desk.floorId));

  const locationLabel = [group?.name, sector?.name, subsector?.name].filter(Boolean).join(" / ");
  const activeLabel = labels.find(l => l.id === (editing ? editLabelId : desk.labelId));

  const handleAddUser = (nameToAdd) => {
    const name = (nameToAdd || newUserName).trim();
    if (name && !editUsers.includes(name)) {
      setEditUsers(prev => [...prev, name]);
    }
    setNewUserName("");
  };

  const handleRemoveUser = (name) => {
    setEditUsers(prev => prev.filter(u => u !== name));
  };

  const handleStartEditUser = (index) => {
    setEditingUserIndex(index);
    setEditingUserValue(editUsers[index]);
    setTimeout(() => editUserInputRef.current?.focus(), 0);
  };

  const handleConfirmEditUser = () => {
    const trimmed = editingUserValue.trim();
    if (trimmed && !editUsers.some((u, i) => u === trimmed && i !== editingUserIndex)) {
      setEditUsers(prev => prev.map((u, i) => i === editingUserIndex ? trimmed : u));
    }
    setEditingUserIndex(null);
    setEditingUserValue("");
  };

  const handleSave = () => {
    onUpdate({
      ...desk,
      name: editName.trim() || desk.name,
      assignedUsers: editUsers,
      labelId: editLabelId || null,
      notes: editNotes.trim(),
      w: editW ? parseInt(editW, 10) : desk.w,
      h: editH ? parseInt(editH, 10) : desk.h
    });
    setEditing(false);
  };

  const handleCancelEdit = () => {
    setEditName(desk.name);
    setEditW(desk.w || "");
    setEditH(desk.h || "");
    setEditUsers(desk.assignedUsers ? [...desk.assignedUsers] : []);
    setEditLabelId(desk.labelId || "");
    setEditNotes(desk.notes || "");
    setNewUserName("");
    setEditing(false);
  };

  const handleToggleLock = () => {
    onUpdate({ ...desk, locked: !desk.locked });
  };

  const deskCode = desk.name;
  const initials = deskCode ? deskCode.slice(0, 2).toUpperCase() : "";
  const isShape = ["salon", "linea", "escalera"].includes(desk.type);

  return (
    <div className="details-drawer">
      {/* Header */}
      <div className="drawer-header">
        <h2 className="drawer-title">Detalles del puesto</h2>
        <button className="drawer-close" onClick={onClose} id="close-details-btn">
          <X size={16} />
        </button>
      </div>

      {/* Avatar + assignment info */}
      {!isShape && (
        <div className="drawer-avatar-section">
          <div className="drawer-avatar" style={{ borderColor: activeLabel ? activeLabel.color : undefined }}>
            {initials}
          </div>
          <div className="drawer-user-info">
            {!editing && (
              <>
                <span className="drawer-label-small">Asignado a</span>
                <span className={`drawer-user-name ${!desk.assignedUsers?.length ? "unassigned" : ""}`}>
                  {desk.assignedUsers?.length > 0 ? desk.assignedUsers.join(", ") : "Sin asignar"}
                </span>
                {activeLabel && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
                    <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: activeLabel.color }} />
                    <span style={{ fontSize: "12px", fontWeight: 600, color: activeLabel.color }}>{activeLabel.name}</span>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit Fields */}
      {editing && (
        <>
          <div className="edit-form-field">
            <label className="drawer-label-small">Nombre</label>
            <input
              className="edit-input"
              type="text"
              value={editName}
              onChange={e => setEditName(e.target.value)}
              id="edit-desk-name-input"
            />
          </div>

          <div className="edit-form-field">
            <label className="drawer-label-small">Etiqueta / Categoría</label>
            <select
              className="edit-select"
              value={editLabelId}
              onChange={e => setEditLabelId(e.target.value)}
            >
              <option value="">Sin etiqueta</option>
              {labels.map(l => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          {isShape && (
            <div style={{ display: "flex", gap: "12px", marginBottom: "16px", alignItems: "flex-end" }}>
              <div className="edit-form-field" style={{ flex: 1, marginBottom: 0 }}>
                <label className="drawer-label-small">Ancho (px)</label>
                <input
                  className="edit-input"
                  type="number"
                  value={editW}
                  onChange={e => setEditW(e.target.value)}
                />
              </div>
              <div className="edit-form-field" style={{ flex: 1, marginBottom: 0 }}>
                <label className="drawer-label-small">Alto (px)</label>
                <input
                  className="edit-input"
                  type="number"
                  value={editH}
                  onChange={e => setEditH(e.target.value)}
                />
              </div>
              <button 
                type="button" 
                className="btn-icon" 
                style={{ padding: "10px", backgroundColor: "var(--color-bg-main)", border: "1px solid var(--color-border)", borderRadius: "8px" }}
                onClick={() => {
                  const temp = editW;
                  setEditW(editH);
                  setEditH(temp);
                }}
                title="Girar 90° (Intercambiar Ancho/Alto)"
              >
                <RotateCw size={18} />
              </button>
            </div>
          )}

          {!isShape && (
            <div className="edit-form-field">
              <label className="drawer-label-small">Asignado a</label>
              <div className="multi-user-input">
                <div className="user-tags">
                  {editUsers.map((u, index) => (
                    <span key={index} className={`user-tag ${editingUserIndex === index ? "user-tag-editing" : ""}`}>
                      {editingUserIndex === index ? (
                        <input
                          ref={editUserInputRef}
                          className="user-tag-edit-input"
                          value={editingUserValue}
                          onChange={e => setEditingUserValue(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") { e.preventDefault(); handleConfirmEditUser(); }
                            if (e.key === "Escape") { setEditingUserIndex(null); }
                          }}
                          onBlur={handleConfirmEditUser}
                        />
                      ) : (
                        <span className="user-tag-text">{u}</span>
                      )}
                      {editingUserIndex !== index && (
                        <button className="user-tag-edit" onClick={() => handleStartEditUser(index)} title="Editar nombre">
                          <Pencil size={11} />
                        </button>
                      )}
                      <button className="user-tag-remove" onClick={() => handleRemoveUser(u)}>
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>

                {employees.length > 0 && (
                  <div style={{ marginBottom: "4px" }}>
                    <select
                      className="edit-select"
                      value=""
                      onChange={e => {
                        if (e.target.value) handleAddUser(e.target.value);
                      }}
                    >
                      <option value="">-- Elegir de empleados registrados --</option>
                      {employees
                        .filter(emp => !editUsers.includes(emp.name))
                        .map(emp => (
                          <option key={emp.id} value={emp.name}>
                            {emp.name}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                <div className="add-user-row">
                  <input
                    className="edit-input add-user-input"
                    type="text"
                    value={newUserName}
                    onChange={e => setNewUserName(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); handleAddUser(); } }}
                    placeholder="Escribir otro nombre..."
                    id="edit-user-input"
                  />
                  <button className="btn-add-user" onClick={() => handleAddUser()} type="button">
                    Agregar
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Notes field in edit mode */}
          <div className="edit-form-field">
            <label className="drawer-label-small">Notas</label>
            <textarea
              className="edit-input edit-textarea"
              value={editNotes}
              onChange={e => setEditNotes(e.target.value)}
              placeholder="Agregar una nota sobre este puesto..."
              rows={3}
              id="edit-desk-notes-input"
            />
          </div>
        </>
      )}

      {/* Notes display tile (view mode) */}
      {!editing && desk.notes && (
        <div className="drawer-info-tile">
          <span className="tile-icon"><StickyNote size={18} /></span>
          <div className="tile-content">
            <span className="tile-title">Notas</span>
            <span className="tile-value notes-value">{desk.notes}</span>
          </div>
        </div>
      )}

      {/* Location Tile */}
      <div className="drawer-info-tile">
        <span className="tile-icon"><MapPin size={18} /></span>
        <div className="tile-content">
          <span className="tile-title">Ubicación</span>
          <span className="tile-value">{locationLabel || "Sin ubicación"}</span>
        </div>
      </div>

      {/* Lock Toggle + Rotate */}
      {isAdmin && (
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            id="toggle-lock-btn"
            className={`drawer-lock-btn ${desk.locked ? "locked" : "unlocked"}`}
            onClick={handleToggleLock}
            style={{ flex: 1 }}
          >
            <div className="lock-btn-left">
              <span>{desk.locked ? <Lock size={18} /> : <Unlock size={18} />}</span>
              <div className="lock-btn-text">
                <span>{desk.locked ? "Bloqueado" : "Desbloqueado"}</span>
                <span className="lock-btn-sub">
                  {desk.locked ? "Clic para permitir mover" : "Clic para bloquear"}
                </span>
              </div>
            </div>
            {desk.locked ? <Lock size={16} /> : <Unlock size={16} />}
          </button>
          <button
            className="drawer-lock-btn unlocked"
            onClick={() => onUpdate({ ...desk, rotation: ((desk.rotation || 0) + 90) % 360 })}
            title="Girar 90°"
            style={{ padding: "0 16px", minWidth: "auto" }}
          >
            <RotateCw size={18} />
          </button>
        </div>
      )}

      {/* Footer Buttons */}
      {isAdmin && (
        <div className="drawer-footer">
          {editing ? (
            <>
              <button
                id="save-desk-btn"
                className="btn-edit-toggle save-mode"
                onClick={handleSave}
              >
                <Check size={16} />
                Guardar
              </button>
              <button
                id="cancel-edit-btn"
                className="btn-edit-toggle"
                onClick={handleCancelEdit}
              >
                Cancelar
              </button>
            </>
          ) : (
            <>
              <button
                id="edit-desk-btn"
                className="btn-edit-toggle"
                onClick={() => setEditing(true)}
              >
                <Pencil size={16} />
                Editar
              </button>
              {onClone && (
                <button
                  id="clone-desk-btn"
                  className="btn-edit-toggle"
                  onClick={() => onClone(desk)}
                  title="Clonar elemento"
                  style={{ gap: "6px" }}
                >
                  <Copy size={16} />
                  Clonar
                </button>
              )}
              <button
                id="delete-desk-btn"
                className="btn-delete"
                onClick={() => onDelete(desk.id)}
                title="Eliminar elemento"
              >
                <Trash2 size={16} />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
