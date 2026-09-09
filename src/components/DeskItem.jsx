import React from "react";
import { Lock, Unlock, Printer } from "lucide-react";

export default function DeskItem({
  desk,
  selected,
  multiSelected,
  highlighted,
  isAdmin,
  onMouseDown,
  onClick,
  labels = []
}) {
  const getDimensions = () => {
    switch (desk.type) {
      case "director":
        return { width: 100, height: 40 };
      case "impresora":
        return { width: 60, height: 40 };
      case "salon": return { width: 400, height: 300 };
      case "linea": return { width: 200, height: 4 };
      case "escalera": return { width: 100, height: 100 };
      case "puesto":
      default:
        return { width: 80, height: 40 };
    }
  };

  const baseW = desk.w || getDimensions().width;
  const baseH = desk.h || getDimensions().height;
  const rotation = desk.rotation || 0;

  const isShape = ["salon", "linea", "escalera"].includes(desk.type);
  const activeLabel = labels.find(l => l.id === desk.labelId);

  const classes = [
    "desk-element",
    desk.type,
    desk.locked ? "locked" : "unlocked",
    selected ? "selected" : "",
    multiSelected ? "multi-selected" : "",
    highlighted ? "highlighted" : ""
  ].filter(Boolean).join(" ");

  const handleMouseDown = (e) => {
    if (desk.locked || e.button !== 0) return;
    onMouseDown(e, desk.id);
  };

  return (
    <div
      className={classes}
      style={{
        left: `${desk.x}px`,
        top: `${desk.y}px`,
        width: `${baseW}px`,
        height: `${baseH}px`,
        transform: rotation ? `rotate(${rotation}deg)` : undefined,
        borderTop: activeLabel && !selected ? `3px solid ${activeLabel.color}` : undefined
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => {
        onClick(e, desk);
      }}
    >
      {activeLabel && (
        <span
          className="desk-label-indicator"
          style={{ backgroundColor: activeLabel.color }}
          title={`Etiqueta: ${activeLabel.name}`}
        />
      )}
      {desk.type === "impresora" ? (
        <Printer size={16} className="desk-printer-icon" />
      ) : (
        <span className="desk-name">{desk.name}</span>
      )}
      
      {isAdmin && (
        <span className="desk-lock-icon">
          {desk.locked ? <Lock size={10} /> : <Unlock size={10} />}
        </span>
      )}

      {!isShape && (
        <div className="desk-tooltip">
          <div><strong>{desk.name}</strong></div>
          {activeLabel && (
            <div style={{ fontSize: '10px', color: activeLabel.color, fontWeight: 700 }}>
              ● {activeLabel.name}
            </div>
          )}
          <div style={{ fontSize: '10px', opacity: 0.9 }}>
            {desk.assignedUsers?.length > 0 ? desk.assignedUsers.join(", ") : "Sin asignar"}
          </div>
        </div>
      )}
    </div>
  );
}

