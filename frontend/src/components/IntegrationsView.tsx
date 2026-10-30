import React, { useEffect, useState } from 'react';
import { Integration } from '../types';
import { api } from '../services/api';
import { Server, Cpu, CheckCircle2, ShieldCheck, Activity, Terminal } from 'lucide-react';

export const IntegrationsView: React.FC = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);

  useEffect(() => {
    api.getIntegrations().then(setIntegrations);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '6px' }}>Connected Cloud & Platform Integrations</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
          Real-time health status of Kubernetes, Load Balancers, DNS, Encryption, and Observability services.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
          {integrations.map((item, idx) => (
            <div
              key={idx}
              className="glass-panel"
              style={{ padding: '20px', background: 'rgba(255, 255, 255, 0.02)', display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(6, 182, 212, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Cpu size={18} color="var(--accent-cyan)" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{item.name}</h3>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{item.endpoint}</div>
                  </div>
                </div>
                <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle2 size={12} /> Live
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: '6px' }}>
                  Supported Capabilities:
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {item.capabilities.map((cap, c_idx) => (
                    <span key={c_idx} className="badge badge-purple" style={{ fontSize: '0.65rem' }}>
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
