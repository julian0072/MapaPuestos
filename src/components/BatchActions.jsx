import React from "react";
import { Lock, Unlock, X, CheckSquare, Trash2, MoveHorizontal, MoveVertical, Tag } from "lucide-react";

export default function BatchActions({ count, onSelectAll, onLock, onUnlock, onDelete, onClear, onDistribute, labels = [], onBatchLabel }) {
  return (
    <div className="batch-actions-overlay">
      <div className="batch-actions-bar">
        <span className="batch-actions-count">{count} escritorio{count !== 1 ? "s" : ""} seleccionado{count !== 1 ? "s" : ""}</span>
        <div className="batch-actions-buttons">
          <button className="batch-btn" onClick={onSelectAll}>
            <CheckSquare size={14} /> Seleccionar todos
          </button>
          {labels.length > 0 && onBatchLabel && (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <Tag size={14} style={{ color: "var(--color-text-secondary)", flexShrink: 0 }} />
              <select
                defaultValue=""
                onChange={e => {
                  if (e.target.value !== "") {
                    onBatchLabel(e.target.value === "__none__" ? null : e.target.value);
                    e.target.value = "";
                  }
                }}
                style={{
                  padding: "5px 10px",
                  fontSize: "13px",
                  border: "1px solid var(--color-border)",
                  borderRadius: "8px",
                  background: "var(--color-bg-sidebar)",
                  color: "var(--color-text-primary)",
                  fontFamily: "var(--font-family)",
                  cursor: "pointer",
                  height: "32px"
                }}
              >
                <option value="">Asignar etiqueta...</option>
                <option value="__none__">— Sin etiqueta —</option>
                {labels.map(l => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
          )}
          <button className="batch-btn" onClick={onLock}>
            <Lock size={14} /> Bloquear
          </button>
          <button className="batch-btn" onClick={onUnlock}>
            <Unlock size={14} /> Desbloquear
          </button>
          <button className="batch-btn batch-btn-danger" onClick={onDelete}>
            <Trash2 size={14} /> Eliminar
          </button>
          <button className="batch-btn batch-btn-clear" onClick={onClear}>
            <X size={14} /> Limpiar
          </button>
        </div>
      </div>
    </div>
  );
}
