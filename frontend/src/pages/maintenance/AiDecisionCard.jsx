import React from 'react';
import { Sparkles, Edit3, ShieldAlert } from 'lucide-react';

/**
 * AI Decision Card on Maintenance Detail Page
 * Shows category, severity, reasons, safety rule badge, decision source (if present),
 * and the Override Classification button.
 */
export default function AiDecisionCard({ aiDecision, onOverrideClick, canOverride = true }) {
  if (!aiDecision) return null;

  const category = aiDecision.category || '—';
  const categoryReason = aiDecision.category_reason || '';
  const severity = aiDecision.severity || '—';
  const severityReason = aiDecision.severity_reason || '';
  const decisionSource = aiDecision.decision_source || null;
  const slaMins = aiDecision.sla_minutes || aiDecision.target_sla_minutes;
  const safetyRule =
    aiDecision.safety_rule_text ||
    aiDecision.safety_rule ||
    aiDecision.safety_hazard_detected ||
    (aiDecision.safety_rule_applied ? 'Critical safety hazard protocol triggered' : null);

  let sevClass = 'muted';
  const sevUpper = (severity || '').toUpperCase();
  if (sevUpper === 'CRITICAL') sevClass = 'crit';
  else if (sevUpper === 'HIGH') sevClass = 'warn';

  return (
    <div className="maint-panel">
      <div className="maint-panel-head">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={16} style={{ color: 'var(--maint-primary)' }} />
          <h3 className="maint-panel-title">AI Decision & Classification</h3>
          {/* decision_source badge: render ONLY if it actually exists in response */}
          {decisionSource && (
            <span
              className="maint-pill muted"
              style={{ fontSize: 11, fontWeight: 500, background: '#f0f0f0' }}
            >
              {decisionSource}
            </span>
          )}
        </div>

        {canOverride && onOverrideClick && (
          <button
            type="button"
            className="maint-btn sm"
            onClick={onOverrideClick}
            title="Override category or severity"
          >
            <Edit3 size={13} />
            <span>Override classification</span>
          </button>
        )}
      </div>

      <div className="maint-aigrid">
        {/* Category Row */}
        <div className="maint-ai-label">Category</div>
        <div className="maint-ai-val">
          <div className="maint-ai-val-title">{category}</div>
          {categoryReason && <div className="maint-ai-val-reason">{categoryReason}</div>}
        </div>

        {/* Severity Row */}
        <div className="maint-ai-label">Severity & SLA</div>
        <div className="maint-ai-val">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className={`maint-pill ${sevClass}`}>{severity}</span>
            {slaMins && (
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--maint-ink)' }}>
                {slaMins} min SLA
              </span>
            )}
          </div>
          {severityReason && <div className="maint-ai-val-reason">{severityReason}</div>}
        </div>

        {/* Safety Rule Trigger Row (if applicable) */}
        {safetyRule && (
          <>
            <div className="maint-ai-label">Safety Hazard</div>
            <div className="maint-ai-val">
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  color: '#c13515',
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                <ShieldAlert size={14} />
                <span>
                  {typeof safetyRule === 'string'
                    ? safetyRule
                    : 'Critical safety hazard protocol triggered'}
                </span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
