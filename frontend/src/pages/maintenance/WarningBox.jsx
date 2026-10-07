import React from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Yellow Warning Box for shift warnings (e.g. missing trade skills)
 */
export default function WarningBox({ warnings = [] }) {
  if (!warnings || warnings.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {warnings.map((w, idx) => {
        const msg = typeof w === 'string' ? w : w.message || JSON.stringify(w);
        return (
          <div key={idx} className="maint-warning-box">
            <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: 1, color: '#874e00' }} />
            <div>{msg}</div>
          </div>
        );
      })}
    </div>
  );
}
