import React, { useEffect, useState } from 'react';
import { AuditEvent } from '../types';
import { api } from '../services/api';
import { ShieldCheck, Search, Filter, Lock, CheckCircle2, AlertTriangle, Terminal, FileText } from 'lucide-react';

export const AuditExplorerView: React.FC = () => {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedOutcome, setSelectedOutcome] = useState<string>('ALL');

  useEffect(() => {
    api.getAuditEvents().then(setEvents);
  }, []);

  const filteredEvents = events.filter((ev) => {
    const matchesSearch =
      ev.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ev.actor_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (ev.reason && ev.reason.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesOutcome = selectedOutcome === 'ALL' || ev.outcome === selectedOutcome;
    return matchesSearch && matchesOutcome;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={22} color="var(--accent-cyan)" />
              <h2 style={{ fontSize: '1.4rem', margin: 0 }}>Immutable Audit Log & Compliance Explorer</h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Sequential append-only audit trail enforced by PostgreSQL database triggers preventing unauthorized record modification.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
            <Lock size={14} color="#34D399" />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#34D399' }}>Trigger: prevent_audit_tampering Active</span>
          </div>
        </div>

        {/* Filters Row */}
        <div style={{ display: 'flex', gap: '14px', marginBottom: '20px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '12px' }} />
            <input
              type="text"
              placeholder="Search action, actor, or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 14px 10px 38px',
                borderRadius: '8px',
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--border-subtle)',
                color: '#FFFFFF',
                fontSize: '0.85rem',
                outline: 'none'
              }}
            />
          </div>

          <select
            value={selectedOutcome}
            onChange={(e) => setSelectedOutcome(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#1E293B',
              border: '1px solid var(--border-subtle)',
              color: '#FFFFFF',
              fontSize: '0.85rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">All Outcomes</option>
            <option value="SUCCESS">Success Only</option>
            <option value="FAILURE">Failures Only</option>
            <option value="DENIED">Denied</option>
          </select>
        </div>

        {/* Audit Table */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 14px' }}>Seq #</th>
                <th style={{ padding: '12px 14px' }}>UTC Timestamp</th>
                <th style={{ padding: '12px 14px' }}>Actor</th>
                <th style={{ padding: '12px 14px' }}>Action & Operation</th>
                <th style={{ padding: '12px 14px' }}>Outcome</th>
                <th style={{ padding: '12px 14px' }}>Details & Audit Evidence</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.map((ev) => (
                <tr key={ev.event_id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)' }}>
                  <td style={{ padding: '14px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-cyan)' }}>
                    #{ev.sequence_number || '1000'}
                  </td>
                  <td style={{ padding: '14px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {new Date(ev.occurred_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '14px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#FFFFFF' }}>{ev.actor_id}</div>
                    <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.05)', fontSize: '0.65rem' }}>
                      {ev.actor_type}
                    </span>
                  </td>
                  <td style={{ padding: '14px' }}>
                    <span className="badge badge-purple" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                      {ev.action}
                    </span>
                  </td>
                  <td style={{ padding: '14px' }}>
                    <span className={`badge ${ev.outcome === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                      {ev.outcome}
                    </span>
                  </td>
                  <td style={{ padding: '14px' }}>
                    <div style={{ fontSize: '0.8rem', color: '#CBD5E1', maxWidth: '420px', lineHeight: 1.4 }}>
                      {ev.reason || 'Verified system operation'}
                    </div>
                    {ev.evidence_reference && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                        Ref: {ev.evidence_reference}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
