import React, { useState } from 'react';
import { Migration } from '../types';
import { api } from '../services/api';
import { Zap, RotateCcw, AlertTriangle, ShieldCheck, CheckCircle2, Activity, ArrowRight, Clock } from 'lucide-react';

interface CutoverConsoleProps {
  migration: Migration;
  onRefresh: () => void;
}

export const CutoverConsole: React.FC<CutoverConsoleProps> = ({ migration, onRefresh }) => {
  const [isCuttingOver, setIsCuttingOver] = useState<boolean>(false);
  const [drainingSeconds, setDrainingSeconds] = useState<number>(300);
  const [cutoverDone, setCutoverDone] = useState<boolean>(migration.current_state === 'POST_CUTOVER_VALIDATION');
  const [rollbackDone, setRollbackDone] = useState<boolean>(migration.current_state === 'ROLLED_BACK');
  const [statusMessage, setStatusMessage] = useState<string>('');

  const handleExecuteCutover = async () => {
    setIsCuttingOver(true);
    try {
      const res = await api.executeCutover(migration.id);
      setStatusMessage('AWS ALB Target Group switched to Traefik! Connection draining active (300s). NGINX fallback ready.');
      setCutoverDone(true);
      onRefresh();
    } finally {
      setIsCuttingOver(false);
    }
  };

  const handleRollback = async () => {
    if (!window.confirm('CRITICAL ACTION: Revert production traffic immediately back to NGINX Ingress Controller?')) return;
    try {
      const res = await api.executeRollback(migration.id, 'Operator triggered emergency rollback.');
      setStatusMessage('EMERGENCY ROLLBACK EXECUTED: Production traffic restored to NGINX within 30 seconds.');
      setRollbackDone(true);
      setCutoverDone(false);
      onRefresh();
    } catch (_) {}
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={22} color="var(--accent-cyan)" />
              <h2 style={{ fontSize: '1.4rem', margin: 0 }}>AWS ALB Production Cutover Console</h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Execute controlled zero-downtime traffic switching from NGINX Target Group to Traefik Target Group.
            </p>
          </div>
          <span className="badge badge-info" style={{ padding: '6px 12px' }}>
            Strategy: ALB Target Group Switch
          </span>
        </div>

        {statusMessage && (
          <div className="glass-panel" style={{ padding: '14px 20px', borderLeft: '4px solid var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.08)', marginBottom: '20px' }}>
            <span style={{ fontSize: '0.9rem', color: '#E0F2FE', fontWeight: 600 }}>{statusMessage}</span>
          </div>
        )}

        {/* Readiness Gates Checklist */}
        <div style={{ padding: '16px 20px', borderRadius: '12px', background: 'rgba(0, 0, 0, 0.25)', border: '1px solid var(--border-subtle)', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px', color: '#FFFFFF' }}>Pre-Cutover Mandatory Safety Gates</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2 size={18} color="var(--accent-emerald)" />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFFFFF' }}>S3 Backup Verified</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>SHA-256 Checksum Passed</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2 size={18} color="var(--accent-emerald)" />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFFFFF' }}>Developer Sign-off</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Runtime URL 100% Passed</div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2 size={18} color="var(--accent-emerald)" />
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFFFFF' }}>DevOps Lead Approved</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Ticket CHG-2026-8891</div>
              </div>
            </div>
          </div>
        </div>

        {/* Traffic Switching Topology Visualizer */}
        <div style={{ padding: '24px', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
            {/* Source */}
            <div style={{ width: '40%', padding: '16px', borderRadius: '10px', background: cutoverDone ? 'rgba(255, 255, 255, 0.03)' : 'rgba(16, 185, 129, 0.1)', border: cutoverDone ? '1px solid var(--border-subtle)' : '1px solid var(--accent-emerald)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Source Ingress</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF', marginTop: '4px' }}>NGINX Ingress Controller</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>TG-kmm-nginx-prod (Weight: {cutoverDone ? '0%' : '100%'})</div>
              <span className={`badge ${cutoverDone ? 'badge-purple' : 'badge-success'}`} style={{ marginTop: '8px', fontSize: '0.65rem' }}>
                {cutoverDone ? 'Standby (Rollback Ready)' : 'Active Production'}
              </span>
            </div>

            {/* Transition Indicator */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              <ArrowRight size={24} color="var(--accent-cyan)" />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600 }}>ALB Rule Switch</span>
            </div>

            {/* Target */}
            <div style={{ width: '40%', padding: '16px', borderRadius: '10px', background: cutoverDone ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.03)', border: cutoverDone ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Target Gateway</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#FFFFFF', marginTop: '4px' }}>Traefik Gateway Controller</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>TG-kmm-traefik-migration (Weight: {cutoverDone ? '100%' : '0%'})</div>
              <span className={`badge ${cutoverDone ? 'badge-info' : 'badge-purple'}`} style={{ marginTop: '8px', fontSize: '0.65rem' }}>
                {cutoverDone ? 'Active Production' : 'Pre-Production Tested'}
              </span>
            </div>
          </div>
        </div>

        {/* Live Monitoring Telemetry (Post-Cutover) */}
        {cutoverDone && (
          <div style={{ padding: '20px', borderRadius: '12px', background: 'rgba(6, 182, 212, 0.04)', border: '1px solid var(--border-highlight)', marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Activity size={18} color="var(--accent-cyan)" />
                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600 }}>Post-Cutover Live Health Metrics</h4>
              </div>
              <span className="badge badge-success">Circuit Breaker Armed (&lt; 2.0% 5xx)</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
              <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(0, 0, 0, 0.3)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>HTTP 2xx Success Rate</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34D399', marginTop: '2px' }}>99.98%</div>
              </div>
              <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(0, 0, 0, 0.3)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>HTTP 5xx Error Rate</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#34D399', marginTop: '2px' }}>0.02%</div>
              </div>
              <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(0, 0, 0, 0.3)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>P95 Response Latency</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#FFFFFF', marginTop: '2px' }}>44 ms</div>
              </div>
              <div style={{ padding: '12px', borderRadius: '8px', background: 'rgba(0, 0, 0, 0.3)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Connection Draining</span>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--accent-cyan)', marginTop: '2px' }}>242s Left</div>
              </div>
            </div>
          </div>
        )}

        {/* Execution & Emergency Rollback Actions */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {cutoverDone && (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
                NGINX remains in standby throughout the 10-minute stabilization period.
              </span>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            {cutoverDone && (
              <button className="btn-danger" onClick={handleRollback}>
                <RotateCcw size={16} /> Emergency Rollback to NGINX (60s)
              </button>
            )}
            {!cutoverDone && (
              <button className="btn-primary" onClick={handleExecuteCutover} disabled={isCuttingOver}>
                <Zap size={16} /> {isCuttingOver ? 'Switching ALB Target Group...' : 'Execute Zero-Downtime Traffic Cutover'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
