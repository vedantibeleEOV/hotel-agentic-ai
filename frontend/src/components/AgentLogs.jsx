import React from 'react';
import { Terminal, Bot, Shield, CheckCircle, Clock } from 'lucide-react';

export default function AgentLogs({ logs = [] }) {
  return (
    <div className="table-wrapper" style={{ padding: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <Terminal size={18} color="#818cf8" />
        <h3 style={{ fontSize: '15px', fontWeight: '700' }}>Real-Time Multi-Agent Orchestration Log</h3>
      </div>

      {logs.length === 0 ? (
        <div className="empty-state">
          No agent activity logged yet in this session. Perform an action like Triggering Checkout, Reporting Maintenance, or Completing a Task.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {logs.map((log, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '12px',
                padding: '12px',
                background: 'rgba(0, 0, 0, 0.25)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                fontFamily: 'var(--font-mono)',
                fontSize: '12px',
              }}
            >
              <div style={{ marginTop: '2px' }}>
                {log.type === 'success' ? (
                  <CheckCircle size={15} color="#34d399" />
                ) : log.type === 'agent' ? (
                  <Bot size={15} color="#818cf8" />
                ) : (
                  <Clock size={15} color="#94a3b8" />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#94a3b8', fontSize: '11px', marginBottom: '4px' }}>
                  <strong style={{ color: '#c7d2fe' }}>[{log.agent || 'SYSTEM'}]</strong>
                  <span>{log.timestamp}</span>
                </div>
                <div style={{ color: '#f1f5f9' }}>{log.message}</div>
                {log.details && (
                  <div style={{ marginTop: '4px', color: '#94a3b8', fontSize: '11px' }}>
                    {log.details}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
