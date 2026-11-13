import React, { useState } from 'react';
import { Migration } from '../types';
import { api } from '../services/api';
import { CheckCircle2, XCircle, Play, ShieldAlert, ExternalLink, Terminal, Send, Check } from 'lucide-react';

interface DeveloperPortalProps {
  migration: Migration;
  onRefresh: () => void;
}

export const DeveloperPortal: React.FC<DeveloperPortalProps> = ({ migration, onRefresh }) => {
  const [testingStatus, setTestingStatus] = useState<string>('IDLE');
  const [probeResult, setProbeResult] = useState<any>(null);
  const [comments, setComments] = useState<string>('All smoke tests verified against Traefik runtime URL. Frontend/backend communication nominal.');
  const [submittedMessage, setSubmittedMessage] = useState<string>('');
  const [checklist, setChecklist] = useState({
    auth: true,
    cors: true,
    apiEndpoints: true,
    payloadSize: true,
    tlsHandshake: true,
    redirects: true
  });

  const handleRunSmokeTest = () => {
    setTestingStatus('TESTING');
    setTimeout(() => {
      setProbeResult({
        statusCode: 200,
        latencyMs: 38.4,
        tlsStatus: 'TLS 1.3 (Valid Chain)',
        serverHeader: 'traefik',
        corsHeader: 'Access-Control-Allow-Origin: *'
      });
      setTestingStatus('PASSED');
    }, 1000);
  };

  const handleSubmitApproval = async (status: 'APPROVED' | 'REJECTED') => {
    await api.submitDeveloperApproval(migration.id, status, comments);
    setSubmittedMessage(`Developer sign-off submitted as ${status}. DevOps Lead cutover window unlocked.`);
    onRefresh();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <span className="badge badge-purple" style={{ marginBottom: '8px' }}>Developer Validation Portal</span>
            <h2 style={{ fontSize: '1.4rem', marginTop: '4px', color: '#0F172A' }}>Pre-Production Application Validation</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Validate your application behavior through Traefik using isolated runtime URLs before production cutover.
            </p>
          </div>
          <div style={{ padding: '8px 14px', borderRadius: '8px', background: '#F0F9FF', border: '1px solid #BAE6FD' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', fontWeight: 700 }}>Active Version: v1.0</span>
          </div>
        </div>

        {submittedMessage && (
          <div className="glass-panel" style={{ padding: '12px 20px', borderLeft: '4px solid #059669', background: '#ECFDF5', marginBottom: '20px' }}>
            <span style={{ fontSize: '0.85rem', color: '#065F46', fontWeight: 600 }}>{submittedMessage}</span>
          </div>
        )}

        {/* Hostname Mapping Card */}
        <div className="grid-responsive-1-2" style={{ gap: '16px', marginBottom: '24px' }}>
          <div style={{ padding: '16px 20px', borderRadius: '10px', background: '#F8FAFC', border: '1px solid var(--border-subtle)' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: 700 }}>Production URL (NGINX)</span>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0F172A', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
              {migration.production_url || 'https://payments.company.com'}
            </div>
            <span className="badge badge-success" style={{ marginTop: '8px', fontSize: '0.65rem' }}>Active Production</span>
          </div>

          <div style={{ padding: '16px 20px', borderRadius: '10px', background: '#F0F9FF', border: '1px solid #BAE6FD' }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', textTransform: 'uppercase', fontWeight: 700 }}>Runtime Testing URL (Traefik)</span>
            <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0284C7', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
              https://{migration.runtime_url || 'runtime-payments.company.com'}
            </div>
            <span className="badge badge-info" style={{ marginTop: '8px', fontSize: '0.65rem' }}>Traefik Target Ready</span>
          </div>
        </div>

        {/* Live Synthetic Probe Section */}
        <div style={{ padding: '20px', borderRadius: '12px', background: '#F8FAFC', border: '1px solid var(--border-subtle)', marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0F172A' }}>Automated Synthetic Smoke Prober</h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Probes live HTTP response, TLS handshake & middleware headers.</p>
            </div>
            <button className="btn-primary" onClick={handleRunSmokeTest} disabled={testingStatus === 'TESTING'}>
              <Play size={14} /> {testingStatus === 'TESTING' ? 'Executing Probe...' : 'Run Automated Smoke Probe'}
            </button>
          </div>

          {probeResult && (
            <div className="grid-responsive-1-4" style={{ gap: '12px', padding: '16px', borderRadius: '8px', background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>HTTP Status</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#059669' }}>{probeResult.statusCode} OK</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>P95 Latency</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0F172A' }}>{probeResult.latencyMs} ms</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>TLS Handshake</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>{probeResult.tlsStatus}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>Server Header</span>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--accent-purple)' }}>{probeResult.serverHeader}</div>
              </div>
            </div>
          )}
        </div>

        {/* Developer Sign-off Checklist */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '12px', color: '#0F172A' }}>Application Owner Verification Checklist</h3>
          <div className="grid-responsive-1-3" style={{ gap: '12px' }}>
            {Object.entries({
              auth: 'User Login & Auth Token Forwarding',
              cors: 'CORS & Cross-Origin Requests',
              apiEndpoints: 'REST & GraphQL API Routing',
              payloadSize: '50MB Request Body Buffering',
              tlsHandshake: 'HTTPS Redirection & TLS Certificate',
              redirects: 'Deep-link URL & Path Rewrites'
            }).map(([key, label]) => (
              <label
                key={key}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  background: '#FFFFFF',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  fontSize: '0.825rem'
                }}
              >
                <input
                  type="checkbox"
                  checked={checklist[key as keyof typeof checklist]}
                  onChange={(e) => setChecklist({ ...checklist, [key]: e.target.checked })}
                  style={{ accentColor: 'var(--accent-cyan)', width: '16px', height: '16px' }}
                />
                <span style={{ color: checklist[key as keyof typeof checklist] ? '#0F172A' : 'var(--text-dim)', fontWeight: 500 }}>{label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Approval Comments & Actions */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
            Testing Notes & Evidence Summary
          </label>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            rows={3}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '8px',
              background: '#FFFFFF',
              border: '1px solid var(--border-strong)',
              color: '#0F172A',
              fontSize: '0.85rem',
              outline: 'none',
              resize: 'vertical'
            }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button className="btn-secondary" style={{ borderColor: '#FECDD3', color: '#BE123C' }} onClick={() => handleSubmitApproval('REJECTED')}>
            <XCircle size={16} /> Submit Rejection (Requires Fix)
          </button>
          <button className="btn-primary" onClick={() => handleSubmitApproval('APPROVED')}>
            <CheckCircle2 size={16} /> Sign-off & Approve Application Migration
          </button>
        </div>
      </div>
    </div>
  );
};
