import React from 'react';
import { Flame, AlertTriangle } from 'lucide-react';

/**
 * Big Alert Banner on Maintenance Detail Page
 */
export default function AlertBanner({ alert }) {
  if (!alert) return null;
  const alertText = alert.text || alert.message || '';
  if (!alertText && !alert.title) return null;

  const isCrit =
    alert.type === 'critical_safety' ||
    alert.severity === 'CRITICAL' ||
    alert.title?.toLowerCase().includes('critical') ||
    alert.title?.toLowerCase().includes('safety');

  if (isCrit) {
    return (
      <div className="maint-alert-crit-big">
        <Flame size={24} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <b>{alert.title || 'CRITICAL SAFETY ISSUE'}</b>
          <div>{alertText}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="maint-alert-warn-big">
      <AlertTriangle size={24} style={{ flexShrink: 0, marginTop: 2, color: '#874e00' }} />
      <div>
        <b>{alert.title || 'ATTENTION REQUIRED'}</b>
        <div>{alertText}</div>
      </div>
    </div>
  );
}
