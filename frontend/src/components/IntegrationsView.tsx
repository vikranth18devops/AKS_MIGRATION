import React, { useEffect, useState } from 'react';
import { Integration } from '../types';
import { api } from '../services/api';
import { Server, Cpu, CheckCircle2, ShieldCheck, Activity, Terminal, Eye, Edit3, Trash2 } from 'lucide-react';
import { EntityViewModal, EntityEditModal, EntityDeleteModal } from './EntityActionModals';
import { CloudLogo } from './CloudLogo';

export const IntegrationsView: React.FC = () => {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Modal states
  const [viewModal, setViewModal] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    data: Record<string, any>;
    type: 'cluster' | 'migration' | 'ingress' | 'integration' | 'metric';
  } | null>(null);

  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    title: string;
    initialData: Record<string, any>;
    idx: number;
    fields: { name: string; label: string; type?: 'text' | 'select'; options?: string[] }[];
  } | null>(null);

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    idx: number;
    name: string;
  } | null>(null);

  useEffect(() => {
    api.getIntegrations().then(setIntegrations);
  }, []);

  const handleSaveEdit = async (updatedData: Record<string, any>) => {
    if (!editModal) return;
    setIntegrations((prev) =>
      prev.map((item, i) =>
        i === editModal.idx
          ? {
              ...item,
              name: updatedData.name,
              endpoint: updatedData.endpoint,
              capabilities: updatedData.capabilities
                ? updatedData.capabilities.split(',').map((s: string) => s.trim())
                : item.capabilities
            }
          : item
      )
    );
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal) return;
    setIntegrations((prev) => prev.filter((_, i) => i !== deleteModal.idx));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '6px', color: 'var(--text-main)', fontWeight: 700 }}>
          Connected Cloud & Platform Integrations
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
          Real-time health status of Kubernetes, Load Balancers, DNS, Encryption, and Observability services. Hover over any integration to inspect details or manage connections.
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '16px' }}>
          {integrations.length === 0 ? (
            <div
              style={{
                gridColumn: '1 / -1',
                padding: '48px 24px',
                textAlign: 'center',
                background: '#F8FAFC',
                borderRadius: '12px',
                border: '1px dashed var(--border-subtle)',
                color: 'var(--text-muted)'
              }}
            >
              <Server size={36} style={{ color: 'var(--text-dim)', margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>No Active Integrations</div>
              <p style={{ fontSize: '0.85rem', maxWidth: '440px', margin: '0 auto' }}>
                Connect or authenticate a cloud provider (AWS, Azure, GCP, or On-Premises) to establish live connections with Kubernetes API, Load Balancers, DNS, and Observability services.
              </p>
            </div>
          ) : (
            integrations.map((item, idx) => {
            const isHovered = hoveredIdx === idx;
            return (
              <div
                key={idx}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
                className={`glass-panel grid-card-hover ${isHovered ? 'is-expanded' : ''}`}
                style={{
                  padding: '20px',
                  background: isHovered ? '#F0F9FF' : '#FFFFFF',
                  border: isHovered ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  boxShadow: 'var(--shadow-sm)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: '#F8FAFC',
                        border: '1px solid #E2E8F0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {item.name.includes('AWS') || item.name.includes('Azure') || item.name.includes('GCP') || item.name.includes('Google') || item.name.includes('EKS') || item.name.includes('AKS') || item.name.includes('GKE') ? (
                        <CloudLogo provider={item.name} size={22} />
                      ) : (
                        <Cpu size={18} color="var(--accent-primary)" />
                      )}
                    </div>
                    <div>
                      <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', margin: 0 }}>
                        {item.name}
                      </h3>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                        {item.endpoint}
                      </div>
                    </div>
                  </div>
                  <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <CheckCircle2 size={12} /> Live
                  </span>
                </div>

                <div>
                  <span
                    style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-dim)',
                      fontWeight: 600,
                      display: 'block',
                      marginBottom: '6px'
                    }}
                  >
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

                {/* HOVER OPENS DEEP DETAILS & ACTION BUTTONS */}
                <div className="grid-hover-details">
                  <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className="grid-responsive-1-2" style={{ gap: '6px', fontSize: '0.72rem' }}>
                      <div style={{ background: '#F8FAFC', padding: '6px 8px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                        <span style={{ color: '#64748B', display: 'block' }}>Response Latency</span>
                        <strong style={{ color: '#059669' }}>12ms (Optimal)</strong>
                      </div>
                      <div style={{ background: '#F8FAFC', padding: '6px 8px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                        <span style={{ color: '#64748B', display: 'block' }}>TLS Handshake</span>
                        <strong style={{ color: '#0284C7' }}>TLS 1.3 Verified</strong>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', marginTop: '6px' }}>
                      <button
                        className="btn-action-view"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewModal({
                            isOpen: true,
                            title: `Integration: ${item.name}`,
                            subtitle: item.endpoint,
                            type: 'integration',
                            data: {
                              name: item.name,
                              endpoint: item.endpoint,
                              capabilities: item.capabilities,
                              health_status: 'HEALTHY',
                              latency_ms: 12,
                              tls_version: 'TLS 1.3',
                              last_probed: new Date().toISOString()
                            }
                          });
                        }}
                      >
                        <Eye size={13} /> View
                      </button>
                      <button
                        className="btn-action-edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditModal({
                            isOpen: true,
                            title: `Edit Integration: ${item.name}`,
                            initialData: {
                              name: item.name,
                              endpoint: item.endpoint,
                              capabilities: item.capabilities.join(', ')
                            },
                            idx,
                            fields: [
                              { name: 'name', label: 'Integration Name', type: 'text' },
                              { name: 'endpoint', label: 'Service Endpoint', type: 'text' },
                              { name: 'capabilities', label: 'Capabilities (comma-separated)', type: 'text' }
                            ]
                          });
                        }}
                      >
                        <Edit3 size={13} /> Edit
                      </button>
                      <button
                        className="btn-action-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteModal({
                            isOpen: true,
                            idx,
                            name: item.name
                          });
                        }}
                      >
                        <Trash2 size={13} /> Disconnect
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        </div>
      </div>

      {/* Reusable View Modal */}
      {viewModal && (
        <EntityViewModal
          isOpen={viewModal.isOpen}
          onClose={() => setViewModal(null)}
          title={viewModal.title}
          subtitle={viewModal.subtitle}
          data={viewModal.data}
          type={viewModal.type}
        />
      )}

      {/* Reusable Edit Modal */}
      {editModal && (
        <EntityEditModal
          isOpen={editModal.isOpen}
          onClose={() => setEditModal(null)}
          title={editModal.title}
          initialData={editModal.initialData}
          fields={editModal.fields}
          onSave={handleSaveEdit}
        />
      )}

      {/* Reusable Delete Modal */}
      {deleteModal && (
        <EntityDeleteModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal(null)}
          entityName={deleteModal.name}
          entityType="Platform Integration"
          onConfirmDelete={handleConfirmDelete}
        />
      )}
    </div>
  );
};

