import React, { useState, useEffect } from 'react';

function SettingsModal({ isOpen, onClose, onSave }) {
  const [openRouterKey, setOpenRouterKey] = useState("");
  const [cerebrasKey, setCerebrasKey] = useState("");

  useEffect(() => {
    if (isOpen) {
      setOpenRouterKey(localStorage.getItem("X-Client-OpenRouter-Key") || "");
      setCerebrasKey(localStorage.getItem("X-Client-Cerebras-Key") || "");
    }
  }, [isOpen]);

  const handleSave = () => {
    localStorage.setItem("X-Client-OpenRouter-Key", openRouterKey);
    localStorage.setItem("X-Client-Cerebras-Key", cerebrasKey);
    if (onSave) {
      onSave({ openRouterKey, cerebrasKey });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">🔐 Client BYOK Configurations</span>
          <button className="modal-close-btn" onClick={onClose}>✕</button>
        </div>
        <div className="modal-body">
          <div className="modal-field-group">
            <label className="modal-field-label">OpenRouter API Key (X-Client-OpenRouter-Key)</label>
            <input
              type="password"
              className="modal-input-field"
              placeholder="sk-or-v1-..."
              value={openRouterKey}
              onChange={(e) => setOpenRouterKey(e.target.value)}
            />
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Injects key for the OpenRouter multi-cloud routing tier.
            </span>
          </div>

          <div className="modal-field-group">
            <label className="modal-field-label">Cerebras API Key (X-Client-Cerebras-Key)</label>
            <input
              type="password"
              className="modal-input-field"
              placeholder="csk-..."
              value={cerebrasKey}
              onChange={(e) => setCerebrasKey(e.target.value)}
            />
            <span style={{ fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
              Injects key for the Cerebras high-speed inference tier.
            </span>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-modal-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-modal-action" onClick={handleSave}>Save Keys</button>
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
