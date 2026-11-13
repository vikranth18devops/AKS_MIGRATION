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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={22} color="var(--accent-primary)" />
              <h2 style={{ fontSize: '1.4rem', margin: 0, color: 'var(--text-main)', fontWeight: 700 }}>
                Immutable Audit Log & Compliance Explorer
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Sequential append-only audit trail enforced by PostgreSQL database triggers preventing unauthorized record modification.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', borderRadius: '8px', background: '#ECFDF5', border: '1px solid #A7F3D0' }}>
            <Lock size={14} color="#059669" />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#059669' }}>Trigger: prevent_audit_tampering Active</span>
          </div>
        </div>

        {/* Filters Row */}
        <div style={{ display: 'flex', gap: '14px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 'min(100%, 260px)' }}>
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
                background: '#FFFFFF',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-main)',
                fontSize: '0.85rem',
                outline: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
              }}
            />
          </div>

          <select
            value={selectedOutcome}
            onChange={(e) => setSelectedOutcome(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: '8px',
              background: '#FFFFFF',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-main)',
              fontSize: '0.85rem',
              outline: 'none',
              cursor: 'pointer',
              fontWeight: 500,
              minWidth: '150px'
            }}
          >
            <option value="ALL">All Outcomes</option>
            <option value="SUCCESS">Success Only</option>
            <option value="FAILURE">Failures Only</option>
            <option value="DENIED">Denied</option>
          </select>
        </div>

        {/* Audit Table */}
        <div className="table-responsive-container" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-subtle)', color: 'var(--text-dim)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <th style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Seq #</th>
                <th style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>UTC Timestamp</th>
                <th style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Actor</th>
                <th style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Action & Operation</th>
                <th style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Outcome</th>
                <th style={{ padding: '12px 14px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Details & Audit Evidence</th>
              </tr>
            </thead>
            <tbody>
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '48px 20px', color: 'var(--text-muted)' }}>
                    <FileText size={32} style={{ margin: '0 auto 12px', color: 'var(--text-dim)' }} />
                    <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>No Audit Trail Records Found</div>
                    <p style={{ fontSize: '0.85rem', margin: '0' }}>All authenticated operations, validation events, and approvals will be cryptographically logged here.</p>
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev) => (
                  <tr key={ev.event_id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background-color 0.15s ease' }}>
                    <td style={{ padding: '14px', verticalAlign: 'middle', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--accent-primary)', fontWeight: 600 }}>
                      #{ev.sequence_number || '1000'}
                    </td>
                    <td style={{ padding: '14px', verticalAlign: 'middle', fontSize: '0.8rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {new Date(ev.occurred_at).toLocaleString()}
                    </td>
                    <td style={{ padding: '14px', verticalAlign: 'middle' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main)' }}>{ev.actor_id}</div>
                      <span className="badge" style={{ background: '#F1F5F9', color: '#475569', fontSize: '0.65rem', border: '1px solid #E2E8F0' }}>
                        {ev.actor_type}
                      </span>
                    </td>
                    <td style={{ padding: '14px', verticalAlign: 'middle' }}>
                      <span className="badge badge-purple" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
                        {ev.action}
                      </span>
                    </td>
                    <td style={{ padding: '14px', verticalAlign: 'middle' }}>
                      <span className={`badge ${ev.outcome === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`} style={{ fontSize: '0.7rem' }}>
                        {ev.outcome}
                      </span>
                    </td>
                    <td style={{ padding: '14px', verticalAlign: 'middle' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', maxWidth: '420px', lineHeight: 1.4 }}>
                        {ev.reason || 'Verified system operation'}
                      </div>
                      {ev.evidence_reference && (
                        <div style={{ fontSize: '0.72rem', color: 'var(--accent-primary)', fontFamily: 'var(--font-mono)', marginTop: '4px' }}>
                          Ref: {ev.evidence_reference}
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
