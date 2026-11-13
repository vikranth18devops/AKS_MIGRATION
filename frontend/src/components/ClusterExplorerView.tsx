import React, { useState, useEffect } from 'react';
import { Cluster, DiscoveredIngress, CheckItem, PrerequisitesValidationResponse } from '../types';
import { api } from '../services/api';
import {
  Server,
  CheckCircle2,
  ShieldCheck,
  Plus,
  RefreshCw,
  ArrowUpRight,
  Lock,
  Search,
  Key,
  ShieldAlert,
  ArrowRight,
  AlertTriangle,
  Activity,
  Cpu,
  Layers,
  Clock,
  ExternalLink,
  Eye,
  Edit3,
  Trash2,
  LayoutGrid,
  List
} from 'lucide-react';
import { CloudLogo } from './CloudLogo';
import { EntityViewModal, EntityEditModal, EntityDeleteModal } from './EntityActionModals';
import { ClusterInspectionModal } from './ClusterInspectionModal';

interface ClusterExplorerViewProps {
  clusters: Cluster[];
  onRefreshClusters: () => void;
  onInitiateMigration: (clusterId: string, ingress: DiscoveredIngress) => void;
}

export const ClusterExplorerView: React.FC<ClusterExplorerViewProps> = ({
  clusters,
  onRefreshClusters,
  onInitiateMigration
}) => {
  const [selectedCluster, setSelectedCluster] = useState<Cluster | null>(clusters[0] || null);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list'); // Default to list view first as required
  const [ingresses, setIngresses] = useState<DiscoveredIngress[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [showRegisterModal, setShowRegisterModal] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    if (!selectedCluster && clusters.length > 0) {
      setSelectedCluster(clusters[0]);
    } else if (selectedCluster && !clusters.some(c => c.id === selectedCluster.id)) {
      setSelectedCluster(clusters[0] || null);
    }
  }, [clusters]);

  // Hover states for opening details
  const [hoveredClusterId, setHoveredClusterId] = useState<string | null>(null);
  const [hoveredIngressId, setHoveredIngressId] = useState<string | null>(null);

  // Inspect cluster modal
  const [inspectedCluster, setInspectedCluster] = useState<Cluster | null>(null);

  // Modal states for View, Edit, and Delete
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
    id: string;
    type: 'cluster' | 'ingress';
    fields: { name: string; label: string; type?: 'text' | 'select'; options?: string[] }[];
  } | null>(null);

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
    type: string;
  } | null>(null);

  // Prerequisites Validation State
  const [isValidatingPrereqs, setIsValidatingPrereqs] = useState<boolean>(false);
  const [prereqResponse, setPrereqResponse] = useState<PrerequisitesValidationResponse | null>(null);

  // Authentication Gate State
  const [authMethod, setAuthMethod] = useState<string>('AWS_IAM_ROLE');
  const [authRoleArn, setAuthRoleArn] = useState<string>('');
  const [authToken, setAuthToken] = useState<string>('');
  const [isAuthenticating, setIsAuthenticating] = useState<boolean>(false);
  const [authFeedback, setAuthFeedback] = useState<string | null>(null);

  // Register Form State for Any Cloud
  const [newClusterName, setNewClusterName] = useState<string>('');
  const [newCloudProvider, setNewCloudProvider] = useState<'AWS' | 'Azure' | 'GCP' | 'On-Premises'>('GCP');
  const [newEnvironment, setNewEnvironment] = useState<'production' | 'staging' | 'development'>('production');
  const [newApiEndpoint, setNewApiEndpoint] = useState<string>('');
  const [newRoleArn, setNewRoleArn] = useState<string>('');

  const handleSaveEdit = async (updatedData: Record<string, any>) => {
    if (!editModal) return;
    if (editModal.type === 'cluster') {
      await api.updateCluster(editModal.id, updatedData as any);
      onRefreshClusters();
    } else if (editModal.type === 'ingress') {
      setIngresses((prev) =>
        prev.map((item) => (item.id === editModal.id ? { ...item, ...updatedData } : item))
      );
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal) return;
    if (deleteModal.type === 'Cluster') {
      await api.deleteCluster(deleteModal.id);
      onRefreshClusters();
    } else {
      setIngresses((prev) => prev.filter((item) => item.id !== deleteModal.id));
    }
  };


  useEffect(() => {
    if (selectedCluster) {
      setAuthFeedback(null);
      loadIngresses(selectedCluster.id);
      runPrerequisitesCheck(selectedCluster.id);
    }
  }, [selectedCluster]);

  const loadIngresses = async (clusterId: string) => {
    setLoading(true);
    try {
      const data = await api.getDiscoveredIngresses(clusterId);
      setIngresses(data);
    } catch (_) {
      setIngresses([]);
    } finally {
      setLoading(false);
    }
  };

  const runPrerequisitesCheck = async (clusterId: string) => {
    setIsValidatingPrereqs(true);
    try {
      const res = await api.validatePrerequisites(clusterId);
      setPrereqResponse(res);
    } finally {
      setIsValidatingPrereqs(false);
    }
  };

  const handleAuthenticateCluster = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCluster) return;
    setIsAuthenticating(true);
    setAuthFeedback(null);
    try {
      const result = await api.authenticateCluster(selectedCluster.id, {
        auth_method: authMethod,
        role_arn: authRoleArn,
        token: authToken
      });
      setAuthFeedback(result.message);
      selectedCluster.is_authenticated = true;
      selectedCluster.auth_method = authMethod;
      await runPrerequisitesCheck(selectedCluster.id);
      await loadIngresses(selectedCluster.id);
      onRefreshClusters();
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleRegisterCluster = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.registerCluster({
      name: newClusterName,
      cloud_provider: newCloudProvider,
      environment: newEnvironment,
      api_endpoint: newApiEndpoint,
      auth_method: newCloudProvider === 'AWS' ? 'AWS_IAM_ROLE' : newCloudProvider === 'Azure' ? 'AZURE_WORKLOAD_IDENTITY' : 'SERVICE_ACCOUNT_TOKEN',
      role_arn: newRoleArn
    });
    setShowRegisterModal(false);
    onRefreshClusters();
  };

  const filteredIngresses = ingresses.filter(
    (ing) =>
      ing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ing.hosts.some((h) => h.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Cluster Selection Header */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <Server size={24} color="var(--accent-cyan)" />
              <h2 style={{ fontSize: '1.4rem', margin: 0, color: 'var(--text-main)' }}>
                Multi-Cloud Cluster Explorer & Prerequisites Gate
              </h2>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '4px' }}>
              Connect any cloud cluster (AWS EKS, Azure AKS, GCP GKE). Automated validation verifies prerequisites before unlocking Ingress discovery and Traefik migration.
            </p>
            {/* Multi-Cloud Discovered Cluster Count Badges */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
              <span className="badge badge-info" style={{ fontSize: '0.72rem', fontWeight: 800 }}>
                Total: {clusters.length} Clusters
              </span>
              <span className="badge badge-success" style={{ fontSize: '0.72rem', fontWeight: 700 }}>
                ✓ {clusters.filter(c => c.is_authenticated).length} Authenticated & Unlocked
              </span>
              <span className="badge" style={{ background: '#FFFBEB', color: '#D97706', border: '1px solid #FDE68A', fontSize: '0.70rem', fontWeight: 600 }}>
                AWS: {clusters.filter(c => c.cloud_provider === 'AWS').length}
              </span>
              <span className="badge" style={{ background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE', fontSize: '0.70rem', fontWeight: 600 }}>
                Azure: {clusters.filter(c => c.cloud_provider === 'Azure').length}
              </span>
              <span className="badge" style={{ background: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', fontSize: '0.70rem', fontWeight: 600 }}>
                GCP: {clusters.filter(c => c.cloud_provider === 'GCP' || c.cloud_provider === 'Google Cloud').length}
              </span>
              <span className="badge" style={{ background: '#F8FAFC', color: '#475569', border: '1px solid #CBD5E1', fontSize: '0.70rem', fontWeight: 600 }}>
                On-Prem: {clusters.filter(c => c.cloud_provider === 'On-Premises').length}
              </span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {/* View Switcher: List First, then Grid */}
            <div style={{ display: 'flex', alignItems: 'center', background: '#F1F5F9', padding: '3px', borderRadius: '8px', border: '1px solid #CBD5E1' }}>
              <button
                onClick={() => setViewMode('list')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: viewMode === 'list' ? '#FFFFFF' : 'transparent',
                  color: viewMode === 'list' ? '#0284C7' : '#64748B',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: viewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
                title="List View"
              >
                <List size={14} /> List View
              </button>
              <button
                onClick={() => setViewMode('grid')}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: viewMode === 'grid' ? '#FFFFFF' : 'transparent',
                  color: viewMode === 'grid' ? '#0284C7' : '#64748B',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                }}
                title="Grid View"
              >
                <LayoutGrid size={14} /> Grid View
              </button>
            </div>

            <button className="btn-secondary" onClick={() => selectedCluster && runPrerequisitesCheck(selectedCluster.id)} disabled={!selectedCluster || isValidatingPrereqs}>
              <RefreshCw size={16} className={isValidatingPrereqs ? 'pulse-indicator' : ''} /> {isValidatingPrereqs ? 'Validating...' : 'Re-run Validation'}
            </button>
            <button className="btn-primary" onClick={() => setShowRegisterModal(true)}>
              <Plus size={16} /> Connect & Migrate Cluster
            </button>
          </div>
        </div>

        {/* VIEW CONDITIONAL: LIST VIEW FIRST, THEN GRID */}
        {viewMode === 'list' ? (
          <div
            className="glass-panel"
            style={{
              overflowX: 'auto',
              background: '#FFFFFF',
              borderRadius: '14px',
              border: '1px solid #E2E8F0',
              boxShadow: 'var(--shadow-card)'
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.82rem' }}>
              <thead>
                <tr
                  style={{
                    background: '#F8FAFC',
                    borderBottom: '1px solid #E2E8F0',
                    color: '#64748B',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em'
                  }}
                >
                  <th style={{ padding: '14px 18px', width: '40px' }}>Active</th>
                  <th style={{ padding: '14px 16px' }}>Cluster & Cloud Provider</th>
                  <th style={{ padding: '14px 16px' }}>Version & Environment</th>
                  <th style={{ padding: '14px 16px' }}>Namespaces</th>
                  <th style={{ padding: '14px 16px' }}>Authentication Status</th>
                  <th style={{ padding: '14px 18px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {clusters.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '48px 24px', color: 'var(--text-muted)' }}>
                      <Server size={32} style={{ color: 'var(--text-dim)', margin: '0 auto 12px' }} />
                      <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>No Kubernetes Clusters Found</div>
                      <p style={{ fontSize: '0.85rem', margin: '0 0 16px' }}>
                        Connect an AWS EKS, Azure AKS, Google GKE, or On-Premises cluster to discover ingresses.
                      </p>
                      <button className="btn-primary" onClick={() => setShowRegisterModal(true)} style={{ fontSize: '0.82rem', padding: '6px 14px', margin: '0 auto', display: 'inline-flex', alignItems: 'center' }}>
                        <Plus size={14} style={{ marginRight: '6px' }} /> Connect Cluster
                      </button>
                    </td>
                  </tr>
                ) : (
                  clusters.map((c) => {
                    const isSelected = selectedCluster?.id === c.id;
                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedCluster(c)}
                        style={{
                          borderBottom: '1px solid #F1F5F9',
                          background: isSelected ? '#F0F9FF' : '#FFFFFF',
                          cursor: 'pointer',
                          transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.background = '#F8FAFC';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.background = '#FFFFFF';
                        }}
                      >
                      <td style={{ padding: '14px 18px' }}>
                        <div
                          style={{
                            width: '18px',
                            height: '18px',
                            borderRadius: '50%',
                            border: isSelected ? '5px solid var(--accent-cyan)' : '2px solid #CBD5E1',
                            background: '#FFFFFF',
                            transition: 'all 0.15s ease'
                          }}
                        />
                      </td>

                      <td style={{ padding: '14px 16px' }}>
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
                            <CloudLogo provider={c.cloud_provider} size={22} />
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontWeight: 700, color: isSelected ? 'var(--accent-cyan)' : '#0F172A', fontSize: '0.92rem' }}>
                                {c.name}
                              </span>
                              <span className="badge badge-info" style={{ fontSize: '0.65rem' }}>
                                {c.cloud_provider}
                              </span>
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748B', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                              {c.api_endpoint.slice(0, 42)}...
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 600, color: '#0F172A' }}>{c.kubernetes_version || 'v1.28.4'}</div>
                        <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize', fontSize: '0.72rem', fontWeight: 600 }}>
                          {c.environment}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <strong style={{ color: '#0F172A' }}>{c.namespaces_count || (c.namespaces_list?.length ?? 0)}</strong>{' '}
                        <span style={{ color: '#64748B', fontSize: '0.75rem' }}>Active Namespaces</span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        {c.is_authenticated ? (
                          <span className="badge badge-success" style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={12} /> Live Authenticated
                          </span>
                        ) : (
                          <span className="badge badge-warning" style={{ fontSize: '0.68rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Lock size={12} /> Auth Required
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '14px 18px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                          <button
                            className="btn-primary"
                            style={{ padding: '5px 10px', fontSize: '0.72rem', gap: '4px', background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setInspectedCluster(c);
                            }}
                            title="Inspect nodes, active pods, namespaces, and launch migration"
                          >
                            <Activity size={12} /> Inspect
                          </button>
                          <button
                            className="btn-secondary"
                            style={{ padding: '5px 10px', fontSize: '0.72rem', gap: '4px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCluster(c);
                              runPrerequisitesCheck(c.id);
                            }}
                            title="Run automated prerequisites validation"
                          >
                            <RefreshCw size={12} /> Validate Prereqs
                          </button>
                          <button
                            className="btn-action-view"
                            style={{ padding: '5px 8px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewModal({
                                isOpen: true,
                                title: `Cluster: ${c.name}`,
                                subtitle: `${c.cloud_provider} • ${c.environment}`,
                                type: 'cluster',
                                data: {
                                  id: c.id,
                                  name: c.name,
                                  cloud_provider: c.cloud_provider,
                                  environment: c.environment,
                                  api_endpoint: c.api_endpoint,
                                  kubernetes_version: c.kubernetes_version || 'v1.28.4',
                                  auth_method: c.auth_method || 'IAM / OIDC',
                                  namespaces_count: c.namespaces_count || (c.namespaces_list?.length ?? 0),
                                  status: c.status
                                }
                              });
                            }}
                            title="View cluster specifications"
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            className="btn-action-edit"
                            style={{ padding: '5px 8px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditModal({
                                isOpen: true,
                                title: `Edit Cluster: ${c.name}`,
                                initialData: {
                                  name: c.name,
                                  environment: c.environment,
                                  api_endpoint: c.api_endpoint,
                                  kubernetes_version: c.kubernetes_version || 'v1.28.4'
                                },
                                type: 'cluster',
                                id: c.id,
                                fields: [
                                  { name: 'name', label: 'Cluster Name', type: 'text' },
                                  {
                                    name: 'environment',
                                    label: 'Environment',
                                    type: 'select',
                                    options: ['production', 'staging', 'development']
                                  },
                                  { name: 'api_endpoint', label: 'API Endpoint', type: 'text' },
                                  { name: 'kubernetes_version', label: 'Kubernetes Version', type: 'text' }
                                ]
                              });
                            }}
                            title="Edit cluster details"
                          >
                            <Edit3 size={12} />
                          </button>
                          <button
                            className="btn-action-delete"
                            style={{ padding: '5px 8px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteModal({
                                isOpen: true,
                                id: c.id,
                                name: c.name,
                                type: 'Cluster'
                              });
                            }}
                            title="Delete cluster registration"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        ) : (
          /* Cluster Grid with Hover-Open Details and Action Buttons */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: '16px' }}>
            {clusters.length === 0 ? (
              <div
                style={{
                  gridColumn: '1 / -1',
                  textAlign: 'center',
                  padding: '48px 24px',
                  background: '#FFFFFF',
                  borderRadius: '14px',
                  border: '1px dashed #CBD5E1',
                  color: 'var(--text-muted)'
                }}
              >
                <Server size={32} style={{ color: 'var(--text-dim)', margin: '0 auto 12px' }} />
                <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: '4px' }}>No Kubernetes Clusters Found</div>
                <p style={{ fontSize: '0.85rem', margin: '0 0 16px' }}>
                  Connect an AWS EKS, Azure AKS, Google GKE, or On-Premises cluster to discover ingresses.
                </p>
                <button className="btn-primary" onClick={() => setShowRegisterModal(true)} style={{ fontSize: '0.82rem', padding: '6px 14px', margin: '0 auto', display: 'inline-flex', alignItems: 'center' }}>
                  <Plus size={14} style={{ marginRight: '6px' }} /> Connect Cluster
                </button>
              </div>
            ) : (
              clusters.map((c) => {
                const isSelected = selectedCluster?.id === c.id;
                const isHovered = hoveredClusterId === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCluster(c)}
                    onMouseEnter={() => setHoveredClusterId(c.id)}
                    onMouseLeave={() => setHoveredClusterId(null)}
                    className={`glass-panel grid-card-hover ${isHovered ? 'is-expanded' : ''}`}
                    style={{
                      padding: '18px 20px',
                      cursor: 'pointer',
                      border: isSelected ? '2px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                      background: isSelected ? '#F0F9FF' : '#FFFFFF',
                      boxShadow: isSelected ? 'var(--shadow-hover)' : 'var(--shadow-card)',
                      borderRadius: '14px',
                      position: 'relative'
                    }}
                  >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#F8FAFC', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CloudLogo provider={c.cloud_provider} size={20} />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: '0.98rem', color: isSelected ? 'var(--accent-cyan)' : 'var(--text-main)', wordBreak: 'break-word' }}>
                      {c.name}
                    </span>
                  </div>
                  <span className="badge badge-info" style={{ fontSize: '0.65rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    <CloudLogo provider={c.cloud_provider} size={13} />
                    {c.cloud_provider}
                  </span>
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', wordBreak: 'break-all' }}>
                  {c.api_endpoint.slice(0, 42)}...
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '0.75rem', flexWrap: 'wrap', gap: '6px' }}>
                  <span style={{ color: 'var(--text-muted)', textTransform: 'capitalize', fontWeight: 600 }}>{c.environment}</span>
                  {c.is_authenticated ? (
                    <span className="badge badge-success" style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <CheckCircle2 size={12} /> Authenticated
                    </span>
                  ) : (
                    <span className="badge badge-warning" style={{ fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Lock size={12} /> Auth Required
                    </span>
                  )}
                </div>

                {/* HOVER EXPANDS DETAILS & ACTION BUTTONS */}
                <div className="grid-hover-details">
                  <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div className="grid-responsive-1-2" style={{ gap: '6px', fontSize: '0.72rem' }}>
                      <div style={{ background: '#F8FAFC', padding: '6px 8px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                        <span style={{ color: '#64748B', display: 'block' }}>K8s Version</span>
                        <strong style={{ color: '#0F172A' }}>{c.kubernetes_version || 'v1.28.4'}</strong>
                      </div>
                      <div style={{ background: '#F8FAFC', padding: '6px 8px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                        <span style={{ color: '#64748B', display: 'block' }}>Auth Method</span>
                        <strong style={{ color: '#0F172A' }}>{c.auth_method || 'IAM / OIDC'}</strong>
                      </div>
                      <div style={{ background: '#F8FAFC', padding: '6px 8px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                        <span style={{ color: '#64748B', display: 'block' }}>Namespaces</span>
                        <strong style={{ color: '#0F172A' }}>{c.namespaces_count || (c.namespaces_list?.length ?? 0)} Active</strong>
                      </div>
                      <div style={{ background: '#F8FAFC', padding: '6px 8px', borderRadius: '6px', border: '1px solid #E2E8F0' }}>
                        <span style={{ color: '#64748B', display: 'block' }}>Status</span>
                        <strong style={{ color: '#059669' }}>{c.status}</strong>
                      </div>
                    </div>

                    {/* Action buttons: Inspect, View, Edit, Delete */}
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button
                        className="btn-primary"
                        style={{ padding: '4px 8px', fontSize: '0.68rem', gap: '4px', background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectedCluster(c);
                        }}
                        title="Inspect nodes, active pods, and namespaces"
                      >
                        <Activity size={11} /> Inspect
                      </button>
                      <button
                        className="btn-action-view"
                        onClick={(e) => {
                          e.stopPropagation();
                          setViewModal({
                            isOpen: true,
                            title: `Cluster: ${c.name}`,
                            subtitle: `${c.cloud_provider} • ${c.environment}`,
                            type: 'cluster',
                            data: {
                              id: c.id,
                              name: c.name,
                              cloud_provider: c.cloud_provider,
                              environment: c.environment,
                              api_endpoint: c.api_endpoint,
                              kubernetes_version: c.kubernetes_version || 'v1.28.4',
                              status: c.status,
                              is_authenticated: c.is_authenticated,
                              auth_method: c.auth_method,
                              namespaces_count: c.namespaces_count || (c.namespaces_list?.length ?? 0),
                              created_at: c.created_at
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
                            title: `Edit Cluster: ${c.name}`,
                            initialData: {
                              name: c.name,
                              cloud_provider: c.cloud_provider,
                              environment: c.environment,
                              api_endpoint: c.api_endpoint,
                              kubernetes_version: c.kubernetes_version || 'v1.28.4'
                            },
                            type: 'cluster',
                            id: c.id,
                            fields: [
                              { name: 'name', label: 'Cluster Name', type: 'text' },
                              { name: 'cloud_provider', label: 'Cloud Provider', type: 'select', options: ['AWS', 'Azure', 'Google Cloud', 'On-Premises'] },
                              { name: 'environment', label: 'Environment', type: 'select', options: ['production', 'staging', 'development', 'dr'] },
                              { name: 'api_endpoint', label: 'Kubernetes API Endpoint', type: 'text' },
                              { name: 'kubernetes_version', label: 'Kubernetes Version', type: 'text' }
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
                            id: c.id,
                            name: c.name,
                            type: 'Cluster'
                          });
                        }}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          }))}
        </div>
      )}
      </div>

      {/* AUTOMATED MULTI-CLOUD PREREQUISITES VALIDATION PANEL */}
      {prereqResponse && (
        <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: prereqResponse.all_prerequisites_met ? '#ECFDF5' : '#FFFBEB',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: `1px solid ${prereqResponse.all_prerequisites_met ? '#A7F3D0' : '#FDE68A'}`
                }}
              >
                {prereqResponse.all_prerequisites_met ? (
                  <CheckCircle2 size={20} color="#059669" />
                ) : (
                  <AlertTriangle size={20} color="#D97706" />
                )}
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', margin: 0, color: 'var(--text-main)' }}>
                  Cluster Prerequisites & Readiness Validation: {prereqResponse.cluster_name}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {prereqResponse.message}
                </p>
              </div>
            </div>
            <span
              className={`badge ${prereqResponse.all_prerequisites_met ? 'badge-success' : 'badge-warning'}`}
              style={{ fontSize: '0.75rem', padding: '6px 12px' }}
            >
              {prereqResponse.overall_status === 'PASSED' ? '✓ All Prerequisites Met' : '⚠️ Action Required'}
            </span>
          </div>

          {/* 5 Prerequisites Check Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: '12px' }}>
            {prereqResponse.checks.map((chk) => (
              <div
                key={chk.id}
                style={{
                  padding: '14px 16px',
                  borderRadius: '10px',
                  border: `1px solid ${chk.status === 'PASSED' ? '#A7F3D0' : '#FECDD3'}`,
                  background: chk.status === 'PASSED' ? '#F0FDF4' : '#FFF1F2',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {chk.status === 'PASSED' ? (
                      <CheckCircle2 size={16} color="#059669" className="animate-pop-check" />
                    ) : (
                      <ShieldAlert size={16} color="#E11D48" />
                    )}
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: '#0F172A' }}>
                      {chk.name}
                    </span>
                  </div>
                  {chk.latency_ms !== undefined && chk.latency_ms > 0 && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                      {chk.latency_ms}ms
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.78rem', color: '#475569', lineHeight: 1.4 }}>
                  {chk.details}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CLUSTER AUTHENTICATION GATE (DISPLAYED IF UNAUTHENTICATED) */}
      {!selectedCluster ? null : !selectedCluster.is_authenticated ? (
        <div
          className="glass-panel"
          style={{
            padding: '32px',
            border: '2px solid #FDE68A',
            background: 'linear-gradient(180deg, #FFFBEB 0%, #FFFFFF 100%)',
            boxShadow: 'var(--shadow-card)'
          }}
        >
          <div style={{ maxWidth: '640px', margin: '0 auto', textAlign: 'center' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '16px',
                background: '#FEF3C7',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                border: '1px solid #FCD34D'
              }}
            >
              <Lock size={28} color="#D97706" />
            </div>

            <h3 style={{ fontSize: '1.35rem', marginBottom: '8px', color: '#0F172A' }}>
              Cluster Authentication Prerequisite for {selectedCluster.name}
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '24px' }}>
              To inspect live NGINX Ingress definitions, analyze annotations, and execute the migration to Traefik, live cloud credentials must be authenticated.
            </p>

            <form
              onSubmit={handleAuthenticateCluster}
              style={{
                textAlign: 'left',
                background: '#FFFFFF',
                padding: '24px',
                borderRadius: '12px',
                border: '1px solid var(--border-subtle)',
                boxShadow: 'var(--shadow-sm)',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px'
              }}
            >
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                  Authentication Mechanism
                </label>
                <select
                  value={authMethod}
                  onChange={(e) => setAuthMethod(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#FFFFFF', border: '1px solid var(--border-strong)', color: '#0F172A', outline: 'none', fontSize: '0.85rem' }}
                >
                  <option value="AWS_IAM_ROLE">AWS IAM Role (EKS IRSA / Pod Identity)</option>
                  <option value="AZURE_WORKLOAD_IDENTITY">Azure Workload Identity (AKS)</option>
                  <option value="SERVICE_ACCOUNT_TOKEN">Kubernetes Service Account Token</option>
                  <option value="OIDC_KUBECONFIG">OIDC / Bearer Token Kubeconfig</option>
                </select>
              </div>

              {authMethod === 'AWS_IAM_ROLE' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    IAM Role ARN
                  </label>
                  <input
                    type="text"
                    value={authRoleArn}
                    onChange={(e) => setAuthRoleArn(e.target.value)}
                    placeholder="arn:aws:iam::123456789012:role/kmm-eks-migration-role"
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#FFFFFF', border: '1px solid var(--border-strong)', color: '#0F172A', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                    required
                  />
                </div>
              )}

              {authMethod === 'SERVICE_ACCOUNT_TOKEN' && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '6px' }}>
                    Service Account Bearer Token
                  </label>
                  <textarea
                    value={authToken}
                    onChange={(e) => setAuthToken(e.target.value)}
                    placeholder="eyJhbGciOiJSUzI1NiIsImtpZCI6..."
                    rows={3}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', background: '#FFFFFF', border: '1px solid var(--border-strong)', color: '#0F172A', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}
                    required
                  />
                </div>
              )}

              <button type="submit" className="btn-primary" style={{ justifyContent: 'center', padding: '12px' }} disabled={isAuthenticating}>
                <Key size={16} /> {isAuthenticating ? 'Authenticating & Verifying RBAC...' : 'Authenticate & Unlock Ingress Resources'}
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* DISCOVERED INGRESS TABLE (DISPLAYED ONLY AFTER AUTHENTICATION) */
        <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '14px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                <CheckCircle2 size={20} color="var(--accent-emerald)" />
                <h3 style={{ fontSize: '1.25rem', margin: 0, color: 'var(--text-main)' }}>
                  Discovered Ingress Inventory • {selectedCluster?.name}
                </h3>
                <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                  Session Authenticated
                </span>
              </div>
              <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                Showing live Ingress resources discovered on cluster. Select any ingress to initiate automated Traefik migration.
              </p>
            </div>
            <div style={{ position: 'relative', width: 'min(280px, 100%)' }}>
              <Search size={16} color="var(--text-dim)" style={{ position: 'absolute', left: '12px', top: '10px' }} />
              <input
                type="text"
                placeholder="Search host or ingress name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 36px',
                  borderRadius: '8px',
                  background: '#FFFFFF',
                  border: '1px solid var(--border-strong)',
                  color: '#0F172A',
                  fontSize: '0.8rem',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          <div className="table-responsive-container" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-subtle)', color: 'var(--text-dim)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  <th style={{ padding: '12px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Ingress Resource</th>
                  <th style={{ padding: '12px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Namespace</th>
                  <th style={{ padding: '12px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Hosts & Routing Rules</th>
                  <th style={{ padding: '12px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>TLS Secrets</th>
                  <th style={{ padding: '12px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>Annotations</th>
                  <th style={{ padding: '12px 16px', verticalAlign: 'middle', whiteSpace: 'nowrap', textAlign: 'right' }}>Migration Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredIngresses.map((ing) => (
                  <tr
                    key={ing.id}
                    style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background 0.15s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.9rem' }}>{ing.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                        Backends: {ing.backend_services.join(', ')}
                      </div>
                    </td>
                    <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                      <span className="badge badge-purple" style={{ fontSize: '0.7rem' }}>
                        {ing.namespace}
                      </span>
                    </td>
                    <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        {ing.hosts.map((h, h_idx) => (
                          <div key={h_idx} style={{ fontSize: '0.825rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                            https://{h}
                          </div>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                      <div style={{ fontSize: '0.8rem', color: '#334155', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Lock size={12} color="var(--accent-emerald)" />
                        {ing.tls_secrets.join(', ')}
                      </div>
                    </td>
                    <td style={{ padding: '16px', verticalAlign: 'middle' }}>
                      <span className="badge badge-info" style={{ fontSize: '0.7rem' }}>
                        {ing.annotations_count} Annotations
                      </span>
                    </td>
                    <td style={{ padding: '16px', verticalAlign: 'middle', textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end', alignItems: 'center' }}>
                        <button
                          className="btn-action-view"
                          title="View Ingress Manifest & Specs"
                          onClick={() =>
                            setViewModal({
                              isOpen: true,
                              title: `Ingress: ${ing.name}`,
                              subtitle: `Namespace: ${ing.namespace} • Discovered on ${selectedCluster.name}`,
                              type: 'ingress',
                              data: {
                                id: ing.id,
                                name: ing.name,
                                namespace: ing.namespace,
                                hosts: ing.hosts,
                                paths: ing.paths,
                                tls_secrets: ing.tls_secrets,
                                backend_services: ing.backend_services,
                                annotations_count: ing.annotations_count,
                                annotations: {
                                  "kubernetes.io/ingress.class": "nginx",
                                  "nginx.ingress.kubernetes.io/ssl-redirect": "true",
                                  "nginx.ingress.kubernetes.io/proxy-body-size": "50m",
                                  "nginx.ingress.kubernetes.io/limit-rps": "250"
                                }
                              }
                            })
                          }
                        >
                          <Eye size={13} /> View
                        </button>
                        <button
                          className="btn-action-edit"
                          title="Edit Ingress Configuration"
                          onClick={() =>
                            setEditModal({
                              isOpen: true,
                              title: `Edit Ingress: ${ing.name}`,
                              initialData: {
                                name: ing.name,
                                namespace: ing.namespace,
                                hosts: ing.hosts.join(', '),
                                paths: ing.paths.join(', ')
                              },
                              type: 'ingress',
                              id: ing.id,
                              fields: [
                                { name: 'name', label: 'Ingress Name', type: 'text' },
                                { name: 'namespace', label: 'Namespace', type: 'text' },
                                { name: 'hosts', label: 'Hosts (comma-separated)', type: 'text' },
                                { name: 'paths', label: 'Paths (comma-separated)', type: 'text' }
                              ]
                            })
                          }
                        >
                          <Edit3 size={13} /> Edit
                        </button>
                        <button
                          className="btn-action-delete"
                          title="Exclude Ingress from Migration"
                          onClick={() =>
                            setDeleteModal({
                              isOpen: true,
                              id: ing.id,
                              name: ing.name,
                              type: 'Ingress Resource'
                            })
                          }
                        >
                          <Trash2 size={13} /> Exclude
                        </button>
                        <button
                          className="btn-primary"
                          style={{ fontSize: '0.78rem', padding: '6px 14px' }}
                          onClick={() => onInitiateMigration(selectedCluster.id, ing)}
                        >
                          Migrate <ArrowUpRight size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Register Cluster Modal */}
      {showRegisterModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100
          }}
        >
          <div className="glass-panel modal-responsive-dialog" style={{ width: 'min(560px, 94vw)', padding: '24px', background: '#FFFFFF', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '8px', color: '#0F172A' }}>
              Register Any Cloud Kubernetes Cluster
            </h3>
            <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Connect AWS EKS, Azure AKS, Google Cloud GKE, or On-Premises OpenShift.
            </p>

            <form onSubmit={handleRegisterCluster} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                  Cluster Name
                </label>
                <input
                  type="text"
                  value={newClusterName}
                  onChange={(e) => setNewClusterName(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-strong)', color: '#0F172A', outline: 'none' }}
                  required
                />
              </div>

              <div className="grid-responsive-1-2" style={{ gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                    Cloud Provider
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#F8FAFC', border: '1px solid #CBD5E1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CloudLogo provider={newCloudProvider} size={24} />
                    </div>
                    <select
                      value={newCloudProvider}
                      onChange={(e) => setNewCloudProvider(e.target.value as any)}
                      style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-strong)', color: '#0F172A', outline: 'none' }}
                    >
                      <option value="AWS">AWS EKS</option>
                      <option value="Azure">Azure AKS</option>
                      <option value="GCP">Google Cloud GKE</option>
                      <option value="On-Premises">On-Premises / OpenShift</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                    Environment
                  </label>
                  <select
                    value={newEnvironment}
                    onChange={(e) => setNewEnvironment(e.target.value as any)}
                    style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-strong)', color: '#0F172A', outline: 'none' }}
                  >
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                    <option value="development">Development</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                  Kubernetes API Endpoint
                </label>
                <input
                  type="text"
                  value={newApiEndpoint}
                  onChange={(e) => setNewApiEndpoint(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-strong)', color: '#0F172A', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '4px' }}>
                  {newCloudProvider === 'AWS' ? 'IAM Role ARN' : newCloudProvider === 'Azure' ? 'Managed Identity Client ID' : 'GCP Workload Identity Service Account'}
                </label>
                <input
                  type="text"
                  value={newRoleArn}
                  onChange={(e) => setNewRoleArn(e.target.value)}
                  style={{ width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-strong)', color: '#0F172A', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowRegisterModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Connect & Validate Cluster
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
          entityType={deleteModal.type}
          onConfirmDelete={handleConfirmDelete}
        />
      )}

      {/* Cluster Inspection Drawer with Nodes, Active Pods, Namespaces and Launch Migration (7 Stages) */}
      {inspectedCluster && (
        <ClusterInspectionModal
          cluster={inspectedCluster}
          isOpen={!!inspectedCluster}
          onClose={() => setInspectedCluster(null)}
          onStartMigration={(cId) => {
            const cl = clusters.find(cl => cl.id === cId);
            if (cl && ingresses.length > 0) {
              onInitiateMigration(cId, ingresses[0]);
            }
            setInspectedCluster(null);
          }}
        />
      )}
    </div>
  );
};

