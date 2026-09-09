import React, { useState } from "react";
import { LayoutGrid, AlertCircle, ShieldAlert, LogIn, X } from "lucide-react";
import { getAdminSession, claimAdminSession } from "../firebase";
import "../index.css";

export default function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [conflictSession, setConflictSession] = useState(null);

  const handlePerformAdminLogin = async () => {
    setLoading(true);
    const newSessionId = `admin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const success = await claimAdminSession(newSessionId);
    setLoading(false);
    if (success) {
      onLogin({ username: "administrador", role: "admin", sessionId: newSessionId });
    } else {
      setError("No se pudo iniciar la sesión. Por favor, reintenta.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setConflictSession(null);

    const userClean = username.trim().toLowerCase();
    const passClean = password.trim();

    if (userClean === "administrador" && passClean === "Mjggc3160") {
      setLoading(true);
      const activeSession = await getAdminSession();
      setLoading(false);

      if (activeSession) {
        setError("Ya hay alguien logueado como administrador.");
        setConflictSession(activeSession);
      } else {
        await handlePerformAdminLogin();
      }
    } else if (userClean === "usuario" && passClean === "123456") {
      onLogin({ username: "usuario", role: "viewer" });
    } else {
      setError("Usuario o contraseña incorrectos");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div style={{ margin: "0 auto 16px", width: 48, height: 48, backgroundColor: "var(--color-primary)", color: "white", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <LayoutGrid size={28} />
        </div>
        <h2 className="login-title">Mapa de Puestos</h2>
        <p className="login-subtitle">Herramienta de Soporte IT</p>

        {conflictSession ? (
          <div className="login-conflict-box">
            <div className="login-conflict-icon">
              <ShieldAlert size={32} color="#ef4444" />
            </div>
            <h3 className="login-conflict-title">Sesión activa detectada</h3>
            <p className="login-conflict-text">
              Ya hay una persona logueada como <strong>administrador</strong> en este momento.
            </p>
            <p className="login-conflict-hint">
              Para evitar modificaciones simultáneas que causen pérdida de datos, solo se permite un administrador a la vez.
            </p>
            
            <div className="login-conflict-actions">
              <button
                type="button"
                className="login-button login-button-danger"
                onClick={handlePerformAdminLogin}
                disabled={loading}
              >
                <LogIn size={16} style={{ marginRight: 6 }} />
                {loading ? "Ingresando..." : "Acceder y cerrar la otra sesión"}
              </button>
              
              <button
                type="button"
                className="login-button-secondary"
                onClick={() => {
                  setConflictSession(null);
                  setError("");
                }}
              >
                <X size={16} style={{ marginRight: 6 }} />
                Cancelar
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="login-error">
                <AlertCircle size={16} style={{ verticalAlign: "middle", marginRight: 4 }} />
                <span style={{ verticalAlign: "middle" }}>{error}</span>
              </div>
            )}

            <input
              className="login-input"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Usuario"
              disabled={loading}
              autoFocus
            />

            <input
              className="login-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              disabled={loading}
            />

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Verificando..." : "Iniciar Sesión"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

