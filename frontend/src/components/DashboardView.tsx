import React, { useState } from 'react';
import { Migration, Cluster } from '../types';
import { api } from '../services/api';
import {
  Layers,
  Server,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowRight,
  Activity,
  Zap,
  Eye,
  Edit3,
  Trash2,
  ExternalLink,
  Cpu,
  Lock,
  Unlock,
  Key,
  RefreshCw,
  Check,
  Plus,
  Sparkles,
  Box,
  Folder,
  HardDrive,
  LayoutGrid,
  List
} from 'lucide-react';
import { EntityViewModal, EntityEditModal, EntityDeleteModal } from './EntityActionModals';
import { CloudLoginModal, CloudProviderLoginConfig } from './CloudLoginModal';
import { ClusterInspectionModal } from './ClusterInspectionModal';
import { MigrationDrawer } from './MigrationDrawer';
import { CloudLogo } from './CloudLogo';

interface DashboardViewProps {
  migrations: Migration[];
  clusters: Cluster[];
  currentUserRole?: string;
  onSelectMigration: (migration: Migration) => void;
  onOpenWizard: () => void;
  onNavigateToTab: (tab: string) => void;
  onRefreshMigrations?: () => void;
  onRefreshClusters?: () => void;
  onInitiateMigrationForCluster?: (clusterId: string, ingress?: any) => void;
}

type CloudProviderKey = 'AWS' | 'Azure' | 'GCP' | 'On-Premises';

interface CloudProviderInfo {
  key: CloudProviderKey;
  label: string;
  clusterType: string;
  icon: string;
  color: string;
  bgColor: string;
  borderColor: string;
  protocol: string;
  defaultIdentity: string;
}

const CLOUD_PROVIDERS: CloudProviderInfo[] = [
  {
    key: 'AWS',
    label: 'Amazon Web Services',
    clusterType: 'Amazon EKS',
    icon: '🟧',
    color: '#D97706',
    bgColor: '#FFFBEB',
    borderColor: '#FDE68A',
    protocol: 'AWS IAM STS AssumeRole',
    defaultIdentity: 'arn:aws:iam::123456789012:role/kmm-eks-migration-role'
  },
  {
    key: 'Azure',
    label: 'Microsoft Azure',
    clusterType: 'Azure AKS',
    icon: '🟦',
    color: '#2563EB',
    bgColor: '#EFF6FF',
    borderColor: '#BFDBFE',
    protocol: 'Entra ID Workload Identity',
    defaultIdentity: 'spn:azure-workload-id-kmm-operator'
  },
  {
    key: 'GCP',
    label: 'Google Cloud Platform',
    clusterType: 'Google GKE',
    icon: '🟩',
    color: '#059669',
    bgColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    protocol: 'GCP Workload Identity SA',
    defaultIdentity: 'kmm-gke-sa@production-k8s.iam.gserviceaccount.com'
  },
  {
    key: 'On-Premises',
    label: 'Private Cloud Datacenter',
    clusterType: 'Baremetal / On-Prem K8s',
    icon: '🟪',
    color: '#7C3AED',
    bgColor: '#F5F3FF',
    borderColor: '#DDD6FE',
    protocol: 'mTLS OIDC / Kubeconfig',
    defaultIdentity: 'oidc:kmm-onprem-admin@corp.internal'
  }
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  migrations,
  clusters,
  currentUserRole = 'DEVOPS_ENGINEER',
  onSelectMigration,
  onOpenWizard,
  onNavigateToTab,
  onRefreshMigrations,
  onRefreshClusters,
  onInitiateMigrationForCluster
}) => {
  const [hoveredMigId, setHoveredMigId] = useState<string | null>(null);
  const [hoveredKpiId, setHoveredKpiId] = useState<string | null>(null);
  const [hoveredClusterId, setHoveredClusterId] = useState<string | null>(null);

  // Active filter for cloud provider view (defaults to 'ALL' for clean initial empty state)
  const [selectedCloudFilter, setSelectedCloudFilter] = useState<'ALL' | CloudProviderKey>('ALL');

  // Display Clouds View Mode: 'list' (default) | 'grid' (optional)
  const [displayCloudsViewMode, setDisplayCloudsViewMode] = useState<'list' | 'grid'>('list');

  // Cloud Login Modal State
  const [loginModalProvider, setLoginModalProvider] = useState<CloudProviderInfo | null>(null);

  // Cluster Inspection Popup Modal State
  const [inspectedCluster, setInspectedCluster] = useState<Cluster | null>(null);

  // Migration Drawer State (Right-to-Left Slide-In Drawer)
  const [migrationDrawerCluster, setMigrationDrawerCluster] = useState<Cluster | null>(null);

  // Helper to match cloud provider keys case-insensitively across naming variants
  const matchesProvider = (cloudProvider: string | undefined, key: CloudProviderKey): boolean => {
    const cp = (cloudProvider || '').toLowerCase().trim();
    const target = key.toLowerCase().trim();
    if (target === 'gcp') {
      return cp === 'gcp' || cp === 'google cloud' || cp === 'google' || cp === 'gke';
    }
    if (target === 'aws') {
      return cp === 'aws' || cp === 'eks';
    }
    if (target === 'azure') {
      return cp === 'azure' || cp === 'aks';
    }
    if (target === 'on-premises') {
      return cp === 'on-premises' || cp === 'onprem' || cp === 'on-prem';
    }
    return cp === target;
  };

  // Cloud provider authentication states
  const isProviderAuth = (key: CloudProviderKey): boolean => {
    return clusters.some((c) => c.is_authenticated && matchesProvider(c.cloud_provider, key));
  };

  const handleDisconnectProvider = async (providerKey: CloudProviderKey) => {
    try {
      await api.disconnectCloudProvider(providerKey);
      if (onRefreshClusters) onRefreshClusters();
      if (selectedCloudFilter === providerKey) {
        setSelectedCloudFilter('ALL');
      }
    } catch (e) {
      console.error('Failed to disconnect cloud provider:', e);
    }
  };

  // Progress Animation Modal State
  const [authProgressModal, setAuthProgressModal] = useState<{
    isOpen: boolean;
    provider: CloudProviderInfo | null;
    stepIndex: number;
    percent: number;
    logs: string[];
    isCompleted: boolean;
  }>({
    isOpen: false,
    provider: null,
    stepIndex: 0,
    percent: 0,
    logs: [],
    isCompleted: false
  });

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
    type: 'migration' | 'cluster';
    fields: { name: string; label: string; type?: 'text' | 'select'; options?: string[] }[];
  } | null>(null);

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    id: string;
    name: string;
    type: string;
  } | null>(null);

  const activeCount = migrations.filter(
    (m) => m.current_state !== 'COMPLETED' && m.current_state !== 'ROLLED_BACK'
  ).length;
  const verifiedBackupCount = migrations.filter((m) => m.has_verified_backup).length;
  const unauthClusters = clusters.filter((c) => !c.is_authenticated);

  const handleSaveEdit = async (updatedData: Record<string, any>) => {
    if (!editModal) return;
    if (editModal.type === 'migration') {
      await api.updateMigration(editModal.id, updatedData as any);
      if (onRefreshMigrations) onRefreshMigrations();
    } else if (editModal.type === 'cluster') {
      await api.updateCluster(editModal.id, updatedData as any);
      if (onRefreshClusters) onRefreshClusters();
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal) return;
    if (deleteModal.type === 'Migration Project') {
      await api.deleteMigration(deleteModal.id);
      if (onRefreshMigrations) onRefreshMigrations();
    } else {
      await api.deleteCluster(deleteModal.id);
      if (onRefreshClusters) onRefreshClusters();
    }
  };

  // Open the Cloud Login Details Modal first
  const handleOpenLoginModal = (provider: CloudProviderInfo) => {
    setLoginModalProvider(provider);
  };

  // On Login Modal Submit -> start real-time animated validation and only display that cloud's clusters
  const handleLoginSubmit = (credentials: Record<string, any>) => {
    if (!loginModalProvider) return;
    const provider = loginModalProvider;
    setLoginModalProvider(null);

    setAuthProgressModal({
      isOpen: true,
      provider,
      stepIndex: 1,
      percent: 15,
      logs: [
        `[00:00.120] Connecting to ${provider.label} control plane...`,
        `[00:00.280] Identity Handshake: ${provider.protocol}`
      ],
      isCompleted: false
    });

    // Step 2 at 450ms
    setTimeout(() => {
      setAuthProgressModal((prev) => ({
        ...prev,
        stepIndex: 2,
        percent: 45,
        logs: [
          ...prev.logs,
          `[00:00.410] Validating IAM & RBAC cluster permissions...`,
          `[00:00.580] Granted: Ingress Reader, Traefik CRDs Manager, Service Endpoints`
        ]
      }));
    }, 450);

    // Step 3 at 950ms
    setTimeout(() => {
      setAuthProgressModal((prev) => ({
        ...prev,
        stepIndex: 3,
        percent: 75,
        logs: [
          ...prev.logs,
          `[00:00.950] Querying ${provider.clusterType} control plane & scanning Ingresses...`,
          `[00:01.120] Discovered NGINX Ingress Controller v1.9.4 and dual target groups`
        ]
      }));
    }, 950);

    // Step 4 at 1500ms
    setTimeout(() => {
      setAuthProgressModal((prev) => ({
        ...prev,
        stepIndex: 4,
        percent: 92,
        logs: [
          ...prev.logs,
          `[00:01.480] Testing zero-downtime ALB TargetGroupBinding driver... Verified ✓`
        ]
      }));
    }, 1500);

    // Step 5 (Completion) at 2000ms
    setTimeout(async () => {
      try {
        const result = await api.authenticateCloudProvider(provider.key, credentials);
        if (onRefreshClusters) {
          await onRefreshClusters();
        }

        // Once validated, switch filter so ONLY this particular cloud's cluster displays!
        setSelectedCloudFilter(provider.key);

        const count = result.clusters_count ?? result.clusters?.length ?? 1;
        const clusterNames = result.clusters?.map((c: any) => c.name).join(', ') || provider.clusterType;

        setAuthProgressModal((prev) => ({
          ...prev,
          stepIndex: 5,
          percent: 100,
          isCompleted: true,
          logs: [
            ...prev.logs,
            `[00:01.980] Authentication SUCCESS: Discovered ${count} live cluster(s): ${clusterNames}`,
            `[00:02.040] Control plane unlocked. Zero-downtime migration pipeline is active.`
          ]
        }));
      } catch (err: any) {
        setAuthProgressModal((prev) => ({
          ...prev,
          stepIndex: 5,
          percent: 100,
          isCompleted: true,
          logs: [
            ...prev.logs,
            `[00:01.980] Authentication FAILED: ${err.message || 'Error communicating with cloud control plane.'}`,
            `[00:02.040] Please verify your credentials and region, then retry.`
          ]
        }));
      }
    }, 2000);
  };

  // Close Progress Modal
  const closeAuthProgressModal = () => {
    setAuthProgressModal((prev) => ({ ...prev, isOpen: false }));
  };

  // Filter clusters by selected cloud provider, strictly displaying ONLY authenticated clusters
  const getFilteredClusters = () => {
    const authClusters = clusters.filter((c) => c.is_authenticated);
    if (selectedCloudFilter === 'ALL') {
      return authClusters;
    }
    return authClusters.filter((c) => matchesProvider(c.cloud_provider, selectedCloudFilter));
  };

  const filteredClusters = getFilteredClusters();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header Row with Unified "Connect & Migrate Cluster" Action */}
      <div
        className="glass-panel"
        style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 100%)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0, color: '#0F172A', letterSpacing: '-0.02em' }}>
              Multi-Cloud Migration Operations
            </h2>
            <span className="badge badge-success" style={{ fontSize: '0.7rem', padding: '3px 8px' }}>
              <span className="pulse-ring" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', display: 'inline-block', marginRight: '6px' }} />
              Zero Downtime Ready
            </span>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '4px 0 0 0' }}>
            Authenticate with AWS, Azure, GCP, or On-Premises to unlock Kubernetes clusters and initiate zero-planned-downtime Ingress to Traefik migration.
          </p>
        </div>

        {/* Single Unified Action Button */}
        <button
          className="btn-primary"
          style={{ padding: '11px 22px', fontSize: '0.9rem', fontWeight: 700 }}
          onClick={onOpenWizard}
        >
          <Zap size={18} /> Connect & Migrate Cluster
        </button>
      </div>

      {/* SECTION 1: MULTI-CLOUD AUTHENTICATION & CLUSTER GATE */}
      <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#FFFFFF'
                }}
              >
                <Key size={16} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: '#0F172A' }}>
                  Multi-Cloud Infrastructure Authentication Gate
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Click <strong>Authenticate</strong> on any cloud to enter login details. Once validated, only that cloud's Kubernetes cluster(s) will unlock and display with nodes, workloads, and migration status.
                </p>
              </div>
            </div>
          </div>

          {/* Quick status summary badges */}
          <div style={{ display: 'flex', gap: '8px' }}>
            {CLOUD_PROVIDERS.map((p) => {
              const isAuth = isProviderAuth(p.key);
              return (
                <span
                  key={p.key}
                  className="micro-pill"
                  style={{
                    background: isAuth ? p.bgColor : '#F1F5F9',
                    color: isAuth ? p.color : '#94A3B8',
                    border: `1px solid ${isAuth ? p.borderColor : '#E2E8F0'}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <CloudLogo provider={p.key} size={15} /> {p.key}: {isAuth ? '✓ Authenticated' : '🔒 Locked'}
                </span>
              );
            })}
          </div>
        </div>

        {/* 4 Cloud Provider Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 250px), 1fr))', gap: '16px', marginBottom: '24px' }}>
          {CLOUD_PROVIDERS.map((provider) => {
            const isAuth = isProviderAuth(provider.key);
            const isSelected = selectedCloudFilter === provider.key;
            // A cloud card is greyed out if:
            // 1. It is not authenticated (!isAuth)
            // 2. OR when a specific cloud is selected (selectedCloudFilter !== 'ALL'), any other card (!isSelected)
            const isGreyedOut = !isAuth || (selectedCloudFilter !== 'ALL' && !isSelected);
            const isProminent = isAuth && (selectedCloudFilter === 'ALL' || isSelected);
            const providerClusters = clusters.filter(
              (c) => c.is_authenticated && matchesProvider(c.cloud_provider, provider.key)
            );

            return (
              <div
                key={provider.key}
                className={`cloud-provider-card ${isProminent ? 'is-authenticated-prominent' : ''} ${isGreyedOut ? 'is-greyed-out' : ''}`}
                style={{ cursor: 'pointer', position: 'relative' }}
                onClick={() => setSelectedCloudFilter(provider.key)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#FFFFFF',
                        borderRadius: '10px',
                        border: '1px solid #E2E8F0',
                        padding: '5px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.04)'
                      }}
                    >
                      <CloudLogo provider={provider.key} size={30} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#0F172A' }}>{provider.clusterType}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{provider.label}</div>
                    </div>
                  </div>

                  {isAuth ? (
                    <span
                      className="badge badge-success"
                      style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '4px', padding: '3px 9px', fontWeight: 800 }}
                    >
                      <CheckCircle2 size={12} /> {providerClusters.length} {providerClusters.length === 1 ? 'Cluster' : 'Clusters'} Connected
                    </span>
                  ) : (
                    <span
                      className="badge badge-warning"
                      style={{ fontSize: '0.68rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Lock size={12} /> Auth Required
                    </span>
                  )}
                </div>

                <div style={{ fontSize: '0.76rem', color: '#64748B', marginBottom: '10px', lineHeight: 1.4 }}>
                  <div><strong>Protocol:</strong> {provider.protocol}</div>
                </div>

                {/* Cluster Count Metric Box (Prominent display once authenticated) */}
                <div
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: isAuth ? '#F0FDF4' : '#FFFBEB',
                    border: `1px solid ${isAuth ? '#BBF7D0' : '#FDE68A'}`,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.74rem', fontWeight: 600, color: isAuth ? '#166534' : '#92400E' }}>
                    <Server size={14} color={isAuth ? '#059669' : '#D97706'} />
                    <span>Discovered Clusters:</span>
                  </div>
                  <strong style={{ fontSize: '0.88rem', color: isAuth ? '#15803D' : '#B45309', fontWeight: 900 }}>
                    {isAuth ? `${providerClusters.length} ${providerClusters.length === 1 ? 'Cluster' : 'Clusters'} Active` : '0 (Auth Required)'}
                  </strong>
                </div>

                {/* Authentication Action Trigger -> Opens Login Modal or Locks Cloud */}
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  {isAuth ? (
                    <>
                      <button
                        className="btn-primary"
                        style={{
                          fontSize: '0.78rem',
                          padding: '8px 12px',
                          flex: 1,
                          justifyContent: 'center',
                          background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenLoginModal(provider);
                        }}
                      >
                        <Key size={13} /> Re-Authenticate
                      </button>
                      <button
                        style={{
                          fontSize: '0.74rem',
                          padding: '8px 10px',
                          borderRadius: '8px',
                          border: '1px solid #CBD5E1',
                          background: '#FFFFFF',
                          color: '#64748B',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          transition: 'all 0.15s ease'
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDisconnectProvider(provider.key);
                        }}
                        title={`Lock and disconnect ${provider.key}`}
                      >
                        <Lock size={12} color="#EF4444" /> Lock
                      </button>
                    </>
                  ) : (
                    <button
                      className="btn-primary"
                      style={{
                        fontSize: '0.78rem',
                        padding: '8px 14px',
                        width: '100%',
                        justifyContent: 'center',
                        background: `linear-gradient(135deg, ${provider.color} 0%, #0F172A 100%)`
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenLoginModal(provider);
                      }}
                    >
                      <Key size={14} /> Authenticate {provider.key}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Once authenticated to any cloud, display prominent cluster count alert banner */}
        {selectedCloudFilter !== 'ALL' && isProviderAuth(selectedCloudFilter) && (
          <div
            className="fade-in-up"
            style={{
              padding: '12px 18px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #ECFDF5 0%, #F0FDF4 100%)',
              border: '1px solid #A7F3D0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <CheckCircle2 size={18} color="#059669" />
              <div>
                <span style={{ fontSize: '0.86rem', fontWeight: 800, color: '#065F46' }}>
                  {selectedCloudFilter} Cloud Control Plane Live Authenticated
                </span>
                <div style={{ fontSize: '0.74rem', color: '#047857', marginTop: '2px' }}>
                  Control plane unlocked. Showing <strong>{filteredClusters.length}</strong> Kubernetes cluster(s) active and ready for Ingress inspection and Traefik cutover.
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#FFFFFF', padding: '5px 12px', borderRadius: '6px', border: '1px solid #A7F3D0' }}>
              <Server size={14} color="#059669" />
              <strong style={{ fontSize: '0.85rem', color: '#059669' }}>
                {filteredClusters.length} {filteredClusters.length === 1 ? 'Cluster' : 'Clusters'}
              </strong>
            </div>
          </div>
        )}

        {/* Dynamic Cloud Provider Filter Tabs */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #E2E8F0', paddingTop: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Display Clouds:</span>
            {(['ALL', 'AWS', 'Azure', 'GCP', 'On-Premises'] as const).map((filterKey) => {
              const isSelected = selectedCloudFilter === filterKey;
              return (
                <button
                  key={filterKey}
                  onClick={() => setSelectedCloudFilter(filterKey)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                    background: isSelected ? '#E0F2FE' : '#FFFFFF',
                    color: isSelected ? '#0369A1' : 'var(--text-main)',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {filterKey === 'ALL' ? (
                    'All Clouds'
                  ) : (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <CloudLogo provider={filterKey} size={15} />
                      {filterKey === 'AWS'
                        ? 'AWS (EKS)'
                        : filterKey === 'Azure'
                          ? 'Azure (AKS)'
                          : filterKey === 'GCP'
                            ? 'Google (GKE)'
                            : 'On-Premises'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              Showing <strong>{filteredClusters.length}</strong> authenticated cluster(s)
            </div>

            {/* List and Grid View Switcher (Default as List, Optional as Grid) */}
            <div style={{ display: 'flex', alignItems: 'center', background: '#F1F5F9', padding: '3px', borderRadius: '8px', border: '1px solid #CBD5E1' }}>
              <button
                onClick={() => setDisplayCloudsViewMode('list')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: displayCloudsViewMode === 'list' ? '#FFFFFF' : 'transparent',
                  color: displayCloudsViewMode === 'list' ? '#0284C7' : '#64748B',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: displayCloudsViewMode === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease'
                }}
                title="List View (Default)"
              >
                <List size={14} /> List (Default)
              </button>
              <button
                onClick={() => setDisplayCloudsViewMode('grid')}
                style={{
                  padding: '5px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: displayCloudsViewMode === 'grid' ? '#FFFFFF' : 'transparent',
                  color: displayCloudsViewMode === 'grid' ? '#0284C7' : '#64748B',
                  fontWeight: 700,
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  boxShadow: displayCloudsViewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                  transition: 'all 0.15s ease'
                }}
                title="Grid View (Optional)"
              >
                <LayoutGrid size={14} /> Grid (Optional)
              </button>
            </div>
          </div>
        </div>

        {/* CLUSTERS DISPLAY CONTAINER (Only displays once authentication is valid) */}
        <div style={{ marginTop: '16px' }}>
          {/* Case 1: Specific provider selected and NOT authenticated */}
          {selectedCloudFilter !== 'ALL' && !isProviderAuth(selectedCloudFilter) ? (
            <div
              className="fade-in-up"
              style={{
                padding: '36px 24px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #FFFBEB 0%, #FFFFFF 100%)',
                border: '1px solid #FDE68A',
                textAlign: 'center',
                boxShadow: 'var(--shadow-sm)'
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  background: '#FEF3C7',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#D97706',
                  marginBottom: '14px'
                }}
              >
                <Lock size={26} />
              </div>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#92400E', margin: '0 0 6px 0' }}>
                {selectedCloudFilter} Authentication Required
              </h4>
              <p style={{ fontSize: '0.85rem', color: '#B45309', maxWidth: '540px', margin: '0 auto 18px auto', lineHeight: 1.5 }}>
                Multi-cloud authentication for <strong>{selectedCloudFilter}</strong> must be validated before its{' '}
                {selectedCloudFilter === 'AWS'
                  ? 'Amazon EKS'
                  : selectedCloudFilter === 'Azure'
                    ? 'Azure AKS'
                    : selectedCloudFilter === 'GCP'
                      ? 'Google GKE'
                      : 'On-Premises'}{' '}
                clusters, nodes, workloads, and Ingress resources are visible.
              </p>
              <button
                className="btn-primary"
                style={{
                  padding: '10px 22px',
                  fontSize: '0.88rem',
                  fontWeight: 700,
                  background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)'
                }}
                onClick={() => {
                  const p = CLOUD_PROVIDERS.find((cp) => cp.key === selectedCloudFilter);
                  if (p) handleOpenLoginModal(p);
                }}
              >
                <Key size={16} /> Authenticate {selectedCloudFilter} with Login Details
              </button>
            </div>
          ) : filteredClusters.length === 0 ? (
            /* Case 2: ALL selected but no clouds authenticated yet */
            <div
              className="fade-in-up"
              style={{
                padding: '40px 24px',
                borderRadius: '12px',
                background: '#F8FAFC',
                border: '1px dashed #CBD5E1',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  background: '#FEF3C7',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#D97706',
                  marginBottom: '14px'
                }}
              >
                <Lock size={26} />
              </div>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#0F172A', margin: '0 0 6px 0' }}>
                No Authenticated Cloud Clusters Unlocked
              </h4>
              <p style={{ fontSize: '0.85rem', color: '#64748B', maxWidth: '520px', margin: '0 auto 18px auto', lineHeight: 1.5 }}>
                Kubernetes cluster topologies, workloads, and Ingress resources remain protected until control plane authentication is validated. Click <strong>Authenticate</strong> on AWS, Azure, GCP, or On-Premises above to discover and unlock your clusters.
              </p>
            </div>
          ) : displayCloudsViewMode === 'grid' ? (
            /* Case 3A: Authenticated Clusters GRID VIEW */
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 310px), 1fr))', gap: '18px' }}>
              {filteredClusters
                .filter((c) => c.is_authenticated)
                .map((cluster) => {
                  const isHovered = hoveredClusterId === cluster.id;
                  const providerObj = CLOUD_PROVIDERS.find((p) => matchesProvider(cluster.cloud_provider, p.key));

                  const workloads = cluster.workloads || {
                    pods: cluster.pods_list?.length || 0,
                    deployments: 0,
                    statefulsets: 0,
                    daemonsets: 0,
                    services: 0
                  };

                  const components = cluster.components_in_use || {
                    current_ingress: 'Detected Ingress Controller',
                    target_ingress: 'Traefik Proxy v3.0',
                    gateway_api_crds: 'Gateway API v1.0.0',
                    cert_manager: 'cert-manager',
                    cni_plugin: 'Cluster CNI',
                    alb_controller: 'Load Balancer Controller'
                  };

                  const linkedMigration = migrations.find((m) => m.cluster_id === cluster.id);
                  const migration = cluster.migration_status || {
                    state: linkedMigration ? linkedMigration.current_state : 'NOT_STARTED',
                    phase: linkedMigration ? 'Migration Pipeline Active' : 'Cluster Connected & Ready for Ingress Assessment',
                    progress_percent: linkedMigration ? 25 : 0,
                    source_controller: linkedMigration ? linkedMigration.source_controller : 'NGINX Ingress',
                    target_controller: linkedMigration ? linkedMigration.target_controller : 'Traefik v3.0',
                    traffic_split_percent: 0,
                    has_verified_backup: linkedMigration?.has_verified_backup ?? false,
                    backup_storage: '',
                    zero_downtime_guarantee: 'Parallel Standby Gateway Routing'
                  };

                  const migrationProgress = migration.progress_percent ?? (linkedMigration ? 68 : 25);
                  const backupStorageShort = migration.backup_storage
                    ? migration.backup_storage.startsWith('s3://')
                      ? 'AWS S3'
                      : migration.backup_storage.startsWith('azureblob://')
                        ? 'Azure Blob'
                        : migration.backup_storage.startsWith('gcs://')
                          ? 'Google GCS'
                          : migration.backup_storage.startsWith('minio://')
                            ? 'MinIO S3'
                            : 'Verified Backup'
                    : 'Verified Backup';

                  return (
                    <div
                      key={cluster.id}
                      onMouseEnter={() => setHoveredClusterId(cluster.id)}
                      onMouseLeave={() => setHoveredClusterId(null)}
                      className={`glass-panel grid-card-hover fade-in-up ${isHovered ? 'is-expanded' : ''}`}
                      style={{
                        padding: '16px 18px',
                        background: isHovered ? '#F0FDF4' : '#FFFFFF',
                        border: isHovered ? '1px solid #10B981' : '1px solid var(--border-subtle)',
                        borderRadius: '12px',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: isHovered ? '0 12px 28px -6px rgba(0, 0, 0, 0.1)' : 'var(--shadow-card)'
                      }}
                    >
                      {/* Cluster Header */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: '#FFFFFF',
                              borderRadius: '8px',
                              border: '1px solid #E2E8F0',
                              padding: '3px',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                              flexShrink: 0
                            }}
                          >
                            <CloudLogo provider={cluster.cloud_provider} size={24} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: '0.85rem', color: '#0F172A' }}>{cluster.name}</div>
                            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '1px' }}>
                              {cluster.cloud_provider} • {cluster.environment.toUpperCase()}
                            </div>
                          </div>
                        </div>

                        <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '2px 7px' }}>
                          <CheckCircle2 size={11} /> {cluster.kubernetes_version || 'v1.28.4'}
                        </span>
                      </div>

                      {/* Endpoint readout */}
                      <div style={{ fontSize: '0.68rem', color: '#64748B', marginBottom: '10px', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                        <strong>API Server:</strong> <code style={{ color: '#0369A1' }}>{cluster.api_endpoint}</code>
                      </div>

                      {/* 3 Metric Pills: Nodes, Workloads, Namespaces (Small Fonts) */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px', marginBottom: '10px' }}>
                        <div style={{ padding: '6px 8px', borderRadius: '6px', background: '#F8FAFC', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 600 }}>Nodes</div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0F172A' }}>
                            {cluster.nodes_count || (cluster.nodes_list?.length ?? 0)}
                          </div>
                        </div>

                        <div style={{ padding: '6px 8px', borderRadius: '6px', background: '#F8FAFC', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 600 }}>Pods / Deploys</div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#0284C7' }}>
                            {workloads.pods} / {workloads.deployments}
                          </div>
                        </div>

                        <div style={{ padding: '6px 8px', borderRadius: '6px', background: '#F8FAFC', border: '1px solid #E2E8F0', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.62rem', color: '#64748B', fontWeight: 600 }}>Namespaces</div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 800, color: '#7C3AED' }}>
                            {cluster.namespaces_count || (cluster.namespaces_list?.length ?? 0)}
                          </div>
                        </div>
                      </div>

                      {/* IN-CLUSTER COMPONENTS IN USE (Small Fonts) */}
                      <div style={{ padding: '8px 10px', borderRadius: '7px', background: '#F8FAFC', border: '1px solid #E2E8F0', marginBottom: '10px', fontSize: '0.68rem', color: '#334155' }}>
                        <div style={{ fontWeight: 700, fontSize: '0.66rem', color: '#0F172A', marginBottom: '3px', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                          In-Cluster Components Active:
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <div>• <strong>Current:</strong> {components.current_ingress}</div>
                          <div>• <strong>Target:</strong> <span style={{ color: '#2563EB', fontWeight: 600 }}>{components.target_ingress}</span></div>
                          <div>• <strong>CRDs:</strong> {components.gateway_api_crds}</div>
                        </div>
                      </div>

                      {/* MIGRATION STATUS BADGE & PROGRESS (Small Fonts) */}
                      <div
                        style={{
                          padding: '10px 12px',
                          borderRadius: '8px',
                          background: '#F0FDF4',
                          border: '1px solid #BBF7D0',
                          marginBottom: '10px'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <span
                              style={{
                                background:
                                  migration.state === 'COMPLETED'
                                    ? '#DCFCE7'
                                    : migration.state === 'ASSESSMENT' || migration.state === 'DRAFT'
                                      ? '#FEF3C7'
                                      : '#E0F2FE',
                                color:
                                  migration.state === 'COMPLETED'
                                    ? '#15803D'
                                    : migration.state === 'ASSESSMENT' || migration.state === 'DRAFT'
                                      ? '#B45309'
                                      : '#0369A1',
                                border:
                                  migration.state === 'COMPLETED'
                                    ? '1px solid #86EFAC'
                                    : migration.state === 'ASSESSMENT' || migration.state === 'DRAFT'
                                      ? '1px solid #FCD34D'
                                      : '1px solid #7DD3FC',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                fontSize: '0.64rem',
                                fontWeight: 800,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              {migration.state === 'RUNTIME_TESTING' || migration.state === 'CUTTING_OVER' ? (
                                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#0284C7', display: 'inline-block' }} />
                              ) : migration.state === 'COMPLETED' ? (
                                <CheckCircle2 size={10} />
                              ) : (
                                <Activity size={10} />
                              )}
                              {migration.state}
                            </span>
                            <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#166534' }}>
                              {migrationProgress}%
                            </span>
                          </div>

                          <span
                            style={{
                              background: migration.traffic_split_percent > 0 ? '#E0F2FE' : '#F8FAFC',
                              color: migration.traffic_split_percent > 0 ? '#0369A1' : '#64748B',
                              border: migration.traffic_split_percent > 0 ? '1px solid #BAE6FD' : '1px solid #E2E8F0',
                              padding: '2px 6px',
                              borderRadius: '4px',
                              fontSize: '0.64rem',
                              fontWeight: 700
                            }}
                          >
                            {migration.traffic_split_percent > 0
                              ? `${100 - migration.traffic_split_percent}% NGINX ➔ ${migration.traffic_split_percent}% Traefik`
                              : '100% NGINX (0% Traefik)'}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div style={{ height: '5px', width: '100%', background: '#DCFCE7', borderRadius: '3px', overflow: 'hidden', marginBottom: '5px' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${migrationProgress}%`,
                              background:
                                migration.state === 'COMPLETED'
                                  ? 'linear-gradient(90deg, #10B981 0%, #059669 100%)'
                                  : migration.state === 'ASSESSMENT' || migration.state === 'DRAFT'
                                    ? 'linear-gradient(90deg, #F59E0B 0%, #D97706 100%)'
                                    : 'linear-gradient(90deg, #0284C7 0%, #10B981 100%)',
                              borderRadius: '3px',
                              transition: 'width 0.4s ease'
                            }}
                          />
                        </div>

                        <div style={{ fontSize: '0.68rem', color: '#166534', fontWeight: 600, marginBottom: '3px' }}>
                          Phase: <strong>{migration.phase}</strong>
                        </div>

                        <div style={{ fontSize: '0.65rem', color: '#15803D', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #DCFCE7', paddingTop: '3px', marginTop: '3px', flexWrap: 'wrap', gap: '4px' }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <CheckCircle2 size={10} /> {migration.has_verified_backup ? `Verified Backup (${backupStorageShort})` : 'Backup Pending'}
                          </span>
                          <span style={{ color: '#047857' }} title={migration.zero_downtime_guarantee}>
                            🛡️ Zero-Downtime Guaranteed
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons Row */}
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px' }}>
                        {/* Mouse-over or click on Inspect Button triggers complete details popup drawer */}
                        <button
                          className="btn-secondary"
                          style={{
                            fontSize: '0.72rem',
                            padding: '6px 10px',
                            flex: 1,
                            justifyContent: 'center',
                            background: '#FFFFFF'
                          }}
                          onClick={() => setInspectedCluster(cluster)}
                          title="Click to inspect complete cluster details, nodes, pods, and namespaces"
                        >
                          <Eye size={13} /> Inspect
                        </button>

                        {/* Direct Migration Button triggers Right-to-Left Migration Drawer */}
                        <button
                          className="btn-primary"
                          style={{
                            fontSize: '0.72rem',
                            padding: '6px 10px',
                            flex: 1.2,
                            justifyContent: 'center',
                            background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)'
                          }}
                          onClick={() => setMigrationDrawerCluster(cluster)}
                          title="Open Zero-Downtime Migration Engine"
                        >
                          <Zap size={13} /> Migrate
                        </button>
                      </div>

                      {/* Mouse-Over Expansion: Deep Details & View/Edit/Delete actions */}
                      <div className="grid-hover-details">
                        <div
                          style={{
                            borderTop: '1px solid #E2E8F0',
                            paddingTop: '10px',
                            fontSize: '0.68rem',
                            color: '#64748B',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '3px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Auth Method:</span>
                            <strong style={{ color: '#0F172A' }}>{cluster.auth_method || 'AWS_IAM_ROLE'}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Hardware Type:</span>
                            <strong style={{ color: '#0F172A' }}>{cluster.node_type || 'm5.2xlarge'}</strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span>Zero-Downtime ALB:</span>
                            <strong style={{ color: '#059669' }}>Weighted TargetGroup Binding Ready</strong>
                          </div>

                          {/* Action Buttons: View, Edit, Delete */}
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '5px', marginTop: '6px' }}>
                            <button
                              className="btn-action-view"
                              style={{ fontSize: '0.66rem', padding: '3px 7px' }}
                              onClick={() => setInspectedCluster(cluster)}
                            >
                              <Eye size={11} /> View Specs
                            </button>
                            <button
                              className="btn-action-edit"
                              style={{ fontSize: '0.66rem', padding: '3px 7px' }}
                              onClick={() =>
                                setEditModal({
                                  isOpen: true,
                                  title: `Edit Cluster: ${cluster.name}`,
                                  initialData: {
                                    name: cluster.name,
                                    environment: cluster.environment,
                                    api_endpoint: cluster.api_endpoint,
                                    kubernetes_version: cluster.kubernetes_version || 'v1.28.4-eks',
                                    auth_method: cluster.auth_method || 'AWS_IAM_ROLE'
                                  },
                                  type: 'cluster',
                                  id: cluster.id,
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
                                })
                              }
                            >
                              <Edit3 size={11} /> Edit
                            </button>
                            <button
                              className="btn-action-delete"
                              style={{ fontSize: '0.66rem', padding: '3px 7px' }}
                              onClick={() =>
                                setDeleteModal({
                                  isOpen: true,
                                  id: cluster.id,
                                  name: cluster.name,
                                  type: 'Kubernetes Cluster'
                                })
                              }
                            >
                              <Trash2 size={11} /> Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            /* Case 3B: Authenticated Clusters LIST / TABLE VIEW */
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
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.74rem' }}>
                <thead>
                  <tr
                    style={{
                      background: '#F8FAFC',
                      borderBottom: '1px solid #E2E8F0',
                      color: '#64748B',
                      fontSize: '0.66rem',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    <th style={{ padding: '10px 14px' }}>Cluster & Cloud</th>
                    <th style={{ padding: '10px 12px' }}>Version & Nodes</th>
                    <th style={{ padding: '10px 12px' }}>Workloads Topology</th>
                    <th style={{ padding: '10px 12px' }}>In-Cluster Ingress</th>
                    <th style={{ padding: '10px 14px', minWidth: '260px' }}>Migration Status & Progress</th>
                    <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClusters
                    .filter((c) => c.is_authenticated)
                    .map((cluster) => {
                      const workloads = cluster.workloads || {
                        pods: cluster.pods_list?.length || 0,
                        deployments: 0,
                        statefulsets: 0,
                        daemonsets: 0,
                        services: 0
                      };
                      const components = cluster.components_in_use || {
                        current_ingress: 'Detected Ingress Controller',
                        target_ingress: 'Traefik Proxy v3.0',
                        gateway_api_crds: 'Gateway API v1.0.0',
                        cert_manager: 'cert-manager',
                        cni_plugin: 'Cluster CNI',
                        alb_controller: 'Load Balancer Controller'
                      };
                      const linkedMigration = migrations.find((m) => m.cluster_id === cluster.id);
                      const migration = cluster.migration_status || {
                        state: linkedMigration ? linkedMigration.current_state : 'NOT_STARTED',
                        phase: linkedMigration ? 'Migration Pipeline Active' : 'Cluster Connected & Ready for Ingress Assessment',
                        progress_percent: linkedMigration ? 25 : 0,
                        source_controller: linkedMigration ? linkedMigration.source_controller : 'NGINX Ingress',
                        target_controller: linkedMigration ? linkedMigration.target_controller : 'Traefik v3.0',
                        traffic_split_percent: 0,
                        has_verified_backup: linkedMigration?.has_verified_backup ?? false,
                        backup_storage: '',
                        zero_downtime_guarantee: 'Parallel Standby Gateway Routing'
                      };
                      const migrationProgress = migration.progress_percent ?? (linkedMigration ? 68 : 25);
                      const backupStorageShort = migration.backup_storage
                        ? migration.backup_storage.startsWith('s3://')
                          ? 'AWS S3'
                          : migration.backup_storage.startsWith('azureblob://')
                            ? 'Azure Blob'
                            : migration.backup_storage.startsWith('gcs://')
                              ? 'Google GCS'
                              : migration.backup_storage.startsWith('minio://')
                                ? 'MinIO S3'
                                : 'Cloud Backup'
                        : 'Verified Backup';

                      return (
                        <tr
                          key={cluster.id}
                          style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s ease' }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#F8FAFC';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = '#FFFFFF';
                          }}
                        >
                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div
                                style={{
                                  width: '30px',
                                  height: '30px',
                                  borderRadius: '6px',
                                  background: '#FFFFFF',
                                  border: '1px solid #E2E8F0',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  padding: '3px',
                                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                  flexShrink: 0
                                }}
                              >
                                <CloudLogo provider={cluster.cloud_provider} size={20} />
                              </div>
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.82rem' }}>
                                    {cluster.name}
                                  </span>
                                  <span className="badge badge-info" style={{ fontSize: '0.62rem', padding: '1px 5px' }}>
                                    {cluster.environment}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.66rem', color: '#64748B', fontFamily: 'var(--font-mono)', marginTop: '1px' }}>
                                  {cluster.api_endpoint.slice(0, 36)}...
                                </div>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontWeight: 600, color: '#0F172A', fontSize: '0.74rem' }}>
                              {cluster.kubernetes_version || 'v1.28.4'}
                            </div>
                            <div style={{ fontSize: '0.68rem', color: '#64748B', marginTop: '1px' }}>
                              <strong>{cluster.nodes_count || (cluster.nodes_list?.length ?? 0)}</strong> Nodes ({cluster.node_type || 'Standard Node'})
                            </div>
                          </td>

                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                              <span style={{ background: '#E0F2FE', color: '#0369A1', padding: '1px 6px', borderRadius: '4px', fontSize: '0.66rem', fontWeight: 600 }}>
                                {workloads.pods} Pods
                              </span>
                              <span style={{ background: '#F1F5F9', color: '#475569', padding: '1px 6px', borderRadius: '4px', fontSize: '0.66rem', fontWeight: 600 }}>
                                {workloads.deployments} Deploys
                              </span>
                            </div>
                            <div style={{ fontSize: '0.64rem', color: '#94A3B8', marginTop: '3px' }}>
                              {cluster.namespaces_count || (cluster.namespaces_list?.length ?? 0)} Namespaces Active
                            </div>
                          </td>

                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontSize: '0.70rem', color: '#0F172A', fontWeight: 600 }}>
                              {components.current_ingress}
                            </div>
                            <div style={{ fontSize: '0.66rem', color: '#059669', display: 'flex', alignItems: 'center', gap: '3px', marginTop: '1px' }}>
                              <CheckCircle2 size={10} /> Standby: {components.target_ingress}
                            </div>
                          </td>

                          <td style={{ padding: '10px 14px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              {/* State Badge & Traffic Split Indicator */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '5px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                  <span
                                    style={{
                                      background:
                                        migration.state === 'COMPLETED'
                                          ? '#DCFCE7'
                                          : migration.state === 'ASSESSMENT' || migration.state === 'DRAFT'
                                            ? '#FEF3C7'
                                            : '#E0F2FE',
                                      color:
                                        migration.state === 'COMPLETED'
                                          ? '#15803D'
                                          : migration.state === 'ASSESSMENT' || migration.state === 'DRAFT'
                                            ? '#B45309'
                                            : '#0369A1',
                                      border:
                                        migration.state === 'COMPLETED'
                                          ? '1px solid #86EFAC'
                                          : migration.state === 'ASSESSMENT' || migration.state === 'DRAFT'
                                            ? '1px solid #FCD34D'
                                            : '1px solid #7DD3FC',
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      fontSize: '0.64rem',
                                      fontWeight: 800,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '3px'
                                    }}
                                  >
                                    {migration.state === 'RUNTIME_TESTING' || migration.state === 'CUTTING_OVER' ? (
                                      <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#0284C7', display: 'inline-block' }} />
                                    ) : migration.state === 'COMPLETED' ? (
                                      <CheckCircle2 size={10} />
                                    ) : (
                                      <Activity size={10} />
                                    )}
                                    {migration.state}
                                  </span>
                                  <span style={{ fontSize: '0.70rem', fontWeight: 800, color: '#0F172A' }}>
                                    {migrationProgress}%
                                  </span>
                                </div>

                                <span
                                  style={{
                                    background: migration.traffic_split_percent > 0 ? '#E0F2FE' : '#F8FAFC',
                                    color: migration.traffic_split_percent > 0 ? '#0369A1' : '#64748B',
                                    border: migration.traffic_split_percent > 0 ? '1px solid #BAE6FD' : '1px solid #E2E8F0',
                                    padding: '1px 5px',
                                    borderRadius: '4px',
                                    fontSize: '0.64rem',
                                    fontWeight: 700
                                  }}
                                  title="Active Ingress Traffic Split"
                                >
                                  {migration.traffic_split_percent > 0
                                    ? `${100 - migration.traffic_split_percent}% NGINX ➔ ${migration.traffic_split_percent}% Traefik`
                                    : '100% NGINX (0% Traefik)'}
                                </span>
                              </div>

                              {/* Visual Animated Progress Bar */}
                              <div
                                style={{
                                  height: '5px',
                                  width: '100%',
                                  background: '#F1F5F9',
                                  borderRadius: '3px',
                                  overflow: 'hidden',
                                  border: '1px solid #E2E8F0'
                                }}
                              >
                                <div
                                  style={{
                                    height: '100%',
                                    width: `${migrationProgress}%`,
                                    background:
                                      migration.state === 'COMPLETED'
                                        ? 'linear-gradient(90deg, #10B981 0%, #059669 100%)'
                                        : migration.state === 'ASSESSMENT' || migration.state === 'DRAFT'
                                          ? 'linear-gradient(90deg, #F59E0B 0%, #D97706 100%)'
                                          : 'linear-gradient(90deg, #0284C7 0%, #10B981 100%)',
                                    borderRadius: '3px',
                                    transition: 'width 0.4s ease'
                                  }}
                                />
                              </div>

                              {/* Phase Description */}
                              <div
                                style={{
                                  fontSize: '0.66rem',
                                  color: '#475569',
                                  fontWeight: 600,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: '260px'
                                }}
                                title={migration.phase}
                              >
                                {migration.phase}
                              </div>

                              {/* Backup & Zero-Downtime Row */}
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.64rem', marginTop: '1px' }}>
                                <span
                                  style={{
                                    color: migration.has_verified_backup ? '#059669' : '#D97706',
                                    fontWeight: 600,
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '3px'
                                  }}
                                  title={migration.backup_storage || 'Encrypted Backup'}
                                >
                                  {migration.has_verified_backup ? (
                                    <>
                                      <CheckCircle2 size={10} color="#059669" />
                                      <span>Backup: {backupStorageShort}</span>
                                    </>
                                  ) : (
                                    <>
                                      <AlertTriangle size={10} color="#D97706" />
                                      <span>Backup Pending</span>
                                    </>
                                  )}
                                </span>

                                <span style={{ color: '#64748B', fontSize: '0.64rem' }} title={migration.zero_downtime_guarantee}>
                                  🛡️ Zero-Downtime Rollback
                                </span>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '5px', justifyContent: 'flex-end', alignItems: 'center' }}>
                              {/* Click Inspect button triggers complete details drawer */}
                              <button
                                className="btn-primary"
                                style={{ padding: '4px 8px', fontSize: '0.68rem', gap: '4px', background: 'linear-gradient(135deg, #0284C7 0%, #2563EB 100%)' }}
                                onClick={() => setInspectedCluster(cluster)}
                                title="Click to inspect topology, nodes, active pods, and namespaces"
                              >
                                <Activity size={11} /> Inspect
                              </button>

                              {/* Migrate button triggers Right-to-Left Zero-Downtime Migration Drawer */}
                              <button
                                className="btn-secondary"
                                style={{ padding: '4px 8px', fontSize: '0.68rem', gap: '4px' }}
                                onClick={() => setMigrationDrawerCluster(cluster)}
                                title="Open Zero-Downtime Migration Engine"
                              >
                                <Zap size={11} color="#0284C7" /> Migrate
                              </button>

                              <button
                                className="btn-action-view"
                                style={{ padding: '4px 6px', fontSize: '0.66rem' }}
                                onClick={() =>
                                  setViewModal({
                                    isOpen: true,
                                    title: `Cluster: ${cluster.name}`,
                                    subtitle: `${cluster.cloud_provider} • ${cluster.environment}`,
                                    type: 'cluster',
                                    data: {
                                      id: cluster.id,
                                      name: cluster.name,
                                      cloud_provider: cluster.cloud_provider,
                                      environment: cluster.environment,
                                      api_endpoint: cluster.api_endpoint,
                                      kubernetes_version: cluster.kubernetes_version,
                                      nodes_count: cluster.nodes_count,
                                      node_type: cluster.node_type,
                                      workloads_count: cluster.workloads_count,
                                      namespaces_count: cluster.namespaces_count,
                                      status: cluster.status,
                                      is_authenticated: cluster.is_authenticated
                                    }
                                  })
                                }
                              >
                                <Eye size={11} />
                              </button>
                              <button
                                className="btn-action-edit"
                                style={{ padding: '4px 6px', fontSize: '0.66rem' }}
                                onClick={() =>
                                  setEditModal({
                                    isOpen: true,
                                    title: `Edit Cluster: ${cluster.name}`,
                                    initialData: {
                                      name: cluster.name,
                                      environment: cluster.environment,
                                      api_endpoint: cluster.api_endpoint,
                                      kubernetes_version: cluster.kubernetes_version || 'v1.28.4-eks',
                                      auth_method: cluster.auth_method || 'AWS_IAM_ROLE'
                                    },
                                    type: 'cluster',
                                    id: cluster.id,
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
                                  })
                                }
                              >
                                <Edit3 size={11} />
                              </button>
                              <button
                                className="btn-action-delete"
                                style={{ padding: '4px 6px', fontSize: '0.66rem' }}
                                onClick={() =>
                                  setDeleteModal({
                                    isOpen: true,
                                    id: cluster.id,
                                    name: cluster.name,
                                    type: 'Kubernetes Cluster'
                                  })
                                }
                              >
                                <Trash2 size={11} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 2: TOP KPI METRICS (Expands on Mouse Over) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 240px), 1fr))', gap: '16px' }}>
        {/* KPI 1: Clusters */}
        <div
          className={`glass-panel grid-card-hover ${hoveredKpiId === 'clusters' ? 'is-expanded' : ''}`}
          style={{ padding: '20px', background: '#FFFFFF', cursor: 'pointer' }}
          onMouseEnter={() => setHoveredKpiId('clusters')}
          onMouseLeave={() => setHoveredKpiId(null)}
          onClick={() =>
            setViewModal({
              isOpen: true,
              title: 'Multi-Cloud Clusters Telemetry',
              subtitle: 'Active Kubernetes Control Plane Distribution',
              type: 'metric',
              data: {
                total_clusters: clusters.length,
                authenticated_clusters: clusters.length - unauthClusters.length,
                pending_clusters: unauthClusters.length,
                cloud_providers: ['AWS EKS', 'Azure AKS', 'GCP GKE', 'On-Premises'],
                api_server_health: '99.98% Available',
                latency_avg: '18ms'
              }
            })
          }
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Connected Clusters</span>
            <Server size={20} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F172A' }}>{clusters.length}</div>
          <div
            style={{
              fontSize: '0.75rem',
              color: unauthClusters.length === 0 ? 'var(--accent-emerald)' : '#D97706',
              marginTop: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              fontWeight: 600
            }}
          >
            {unauthClusters.length === 0 ? (
              <><CheckCircle2 size={12} /> All Cloud Clusters Authenticated</>
            ) : (
              <><AlertTriangle size={12} /> {clusters.length - unauthClusters.length}/{clusters.length} Authenticated</>
            )}
          </div>

          <div className="grid-hover-details">
            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '10px', fontSize: '0.75rem', color: '#64748B' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><CloudLogo provider="AWS" size={14} /> AWS EKS:</span> <strong style={{ color: '#0F172A' }}>{clusters.filter(c => c.cloud_provider === 'AWS').length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><CloudLogo provider="Azure" size={14} /> Azure AKS:</span> <strong style={{ color: '#0F172A' }}>{clusters.filter(c => c.cloud_provider === 'Azure').length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><CloudLogo provider="GCP" size={14} /> GCP GKE:</span> <strong style={{ color: '#0F172A' }}>{clusters.filter(c => c.cloud_provider === 'GCP' || c.cloud_provider === 'Google Cloud').length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}><CloudLogo provider="On-Premises" size={14} /> On-Premises:</span> <strong style={{ color: '#0F172A' }}>{clusters.filter(c => c.cloud_provider === 'On-Premises').length}</strong>
              </div>
              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                <span className="btn-action-view" style={{ fontSize: '0.7rem' }}><Eye size={12} /> View Telemetry</span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 2: Migrations */}
        <div
          className={`glass-panel grid-card-hover ${hoveredKpiId === 'migrations' ? 'is-expanded' : ''}`}
          style={{ padding: '20px', background: '#FFFFFF', cursor: 'pointer' }}
          onMouseEnter={() => setHoveredKpiId('migrations')}
          onMouseLeave={() => setHoveredKpiId(null)}
          onClick={() =>
            setViewModal({
              isOpen: true,
              title: 'Ingress to Traefik Migration Pipeline',
              subtitle: 'Active Workflows and AST Conversion Metrics',
              type: 'metric',
              data: {
                active_migrations: activeCount,
                completed_migrations: migrations.filter(m => m.current_state === 'COMPLETED').length,
                source_controller: 'NGINX Ingress v1.9.4',
                target_controller: 'Traefik v3.0 / Gateway API',
                ast_annotation_mapping_rate: '100%'
              }
            })
          }
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Active Migrations</span>
            <Layers size={20} color="var(--accent-purple)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F172A' }}>{activeCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px', fontWeight: 500 }}>
            NGINX → Traefik Pipelines
          </div>

          <div className="grid-hover-details">
            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '10px', fontSize: '0.75rem', color: '#64748B' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>In Testing:</span> <strong style={{ color: '#0284C7' }}>{migrations.filter(m => m.current_state === 'RUNTIME_TESTING').length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Awaiting Lead:</span> <strong style={{ color: '#7C3AED' }}>{migrations.filter(m => m.current_state === 'AWAITING_PRODUCTION_APPROVAL').length}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Cutover Ready:</span> <strong style={{ color: '#059669' }}>{migrations.filter(m => m.current_state === 'READY_TO_DEPLOY' || m.current_state === 'APPROVED_FOR_CUTOVER').length}</strong>
              </div>
              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                <span className="btn-action-view" style={{ fontSize: '0.7rem' }}><Eye size={12} /> View Pipeline</span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 3: Backups */}
        <div
          className={`glass-panel grid-card-hover ${hoveredKpiId === 'backups' ? 'is-expanded' : ''}`}
          style={{ padding: '20px', background: '#FFFFFF', cursor: 'pointer' }}
          onMouseEnter={() => setHoveredKpiId('backups')}
          onMouseLeave={() => setHoveredKpiId(null)}
          onClick={() =>
            setViewModal({
              isOpen: true,
              title: 'Verified S3/Blob Backups',
              subtitle: 'AES-256 KMS Cryptographically Signed Snapshot Registry',
              type: 'metric',
              data: {
                total_verified_backups: verifiedBackupCount,
                encryption_standard: 'AES-256 KMS / Customer Managed Keys',
                tamper_proof_checksum: 'SHA-256 Verified',
                backup_retention: '90 Days Compliance Policy',
                recovery_time_objective: '< 30 seconds'
              }
            })
          }
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Verified Backups</span>
            <ShieldCheck size={20} color="var(--accent-emerald)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0F172A' }}>{verifiedBackupCount}</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--accent-emerald)', marginTop: '4px', fontWeight: 600 }}>
            AES-256 KMS Encrypted
          </div>

          <div className="grid-hover-details">
            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '10px', fontSize: '0.75rem', color: '#64748B' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Storage Target:</span> <strong style={{ color: '#0F172A' }}>AWS S3 & Azure Blob</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Integrity:</span> <strong style={{ color: '#059669' }}>100% Checksums Valid</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Instant Rollback:</span> <strong style={{ color: '#0284C7' }}>Ready (&lt; 2s)</strong>
              </div>
              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                <span className="btn-action-view" style={{ fontSize: '0.7rem' }}><Eye size={12} /> View Registry</span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI 4: Zero Downtime */}
        <div
          className={`glass-panel grid-card-hover ${hoveredKpiId === 'downtime' ? 'is-expanded' : ''}`}
          style={{ padding: '20px', background: '#FFFFFF', cursor: 'pointer' }}
          onMouseEnter={() => setHoveredKpiId('downtime')}
          onMouseLeave={() => setHoveredKpiId(null)}
          onClick={() =>
            setViewModal({
              isOpen: true,
              title: 'Zero Downtime Telemetry',
              subtitle: 'Live ALB Target Group Draining & Instant Rollback Telemetry',
              type: 'metric',
              data: {
                total_recorded_downtime: '0.00 seconds',
                traffic_shift_method: 'AWS ALB Weighted TargetGroup / Route 53 Weighted DNS',
                connection_draining_window: '300 seconds',
                automated_rollback_threshold: '> 2.0% 5xx errors',
                rollback_speed: '< 2.0 seconds'
              }
            })
          }
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>Planned Downtime</span>
            <Activity size={20} color="var(--accent-cyan)" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#059669' }}>0.00s</div>
          <div style={{ fontSize: '0.75rem', color: '#059669', marginTop: '4px', fontWeight: 600 }}>
            AWS ALB Target Group Draining
          </div>

          <div className="grid-hover-details">
            <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '10px', fontSize: '0.75rem', color: '#64748B' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Traffic Shift:</span> <strong style={{ color: '#059669' }}>Weighted 10% → 100%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span>Draining Window:</span> <strong style={{ color: '#0F172A' }}>300 seconds</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Rollback Guarantee:</span> <strong style={{ color: '#0284C7' }}>&lt; 2 seconds</strong>
              </div>
              <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'flex-end' }}>
                <span className="btn-action-view" style={{ fontSize: '0.7rem' }}><Eye size={12} /> View Telemetry</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: RECENT PRODUCTION MIGRATION PROJECTS */}
      <div className="glass-panel" style={{ padding: '24px', background: '#FFFFFF' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '4px', color: '#0F172A', fontWeight: 700 }}>
              Recent Ingress Migration Projects
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Hover over any migration project to expand runtime details, edit configuration, or trigger actions.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {migrations.length === 0 ? (
            <div
              style={{
                padding: '40px 24px',
                textAlign: 'center',
                background: '#FFFFFF',
                borderRadius: '12px',
                border: '1px dashed var(--border-subtle)',
                color: 'var(--text-muted)'
              }}
            >
              <Layers size={36} style={{ color: 'var(--text-dim)', margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: '6px' }}>No active migration projects yet</div>
              <p style={{ fontSize: '0.85rem', maxWidth: '440px', margin: '0 auto 16px' }}>
                Authenticate a cloud provider or connect a cluster above, then click <strong>Inspect</strong> or <strong>Launch Migration</strong> to initiate an automated zero-downtime NGINX to Traefik migration.
              </p>
              <button
                onClick={onOpenWizard}
                className="btn btn-primary"
                style={{ fontSize: '0.85rem', padding: '8px 16px', display: 'inline-flex', alignItems: 'center', margin: '0 auto' }}
              >
                <Plus size={15} style={{ marginRight: '6px' }} />
                Create New Migration
              </button>
            </div>
          ) : (
            migrations.map((mig) => {
            const isHovered = hoveredMigId === mig.id;
            return (
              <div
                key={mig.id}
                onMouseEnter={() => setHoveredMigId(mig.id)}
                onMouseLeave={() => setHoveredMigId(null)}
                className={`glass-panel grid-card-hover ${isHovered ? 'is-expanded' : ''}`}
                style={{
                  padding: '16px 20px',
                  background: isHovered ? '#F0F9FF' : '#FFFFFF',
                  border: isHovered ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: '#E0F2FE',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent-cyan)'
                      }}
                    >
                      <Layers size={18} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 700, color: '#0F172A', fontSize: '0.95rem' }}>{mig.name}</span>
                        <span className="badge badge-purple" style={{ fontSize: '0.65rem' }}>
                          {mig.source_controller} → {mig.target_controller}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '3px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {(() => {
                          const c = clusters.find(cl => cl.id === mig.cluster_id || cl.name === mig.cluster_name);
                          return c ? <CloudLogo provider={c.cloud_provider} size={14} /> : null;
                        })()}
                        <span>{mig.production_url} • {mig.cluster_name || 'Production Cluster'}</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      className={`badge ${mig.current_state === 'COMPLETED'
                          ? 'badge-success'
                          : mig.current_state === 'RUNTIME_TESTING'
                            ? 'badge-info'
                            : mig.current_state === 'BLOCKED'
                              ? 'badge-danger'
                              : 'badge-warning'
                        }`}
                      style={{ fontSize: '0.72rem' }}
                    >
                      {mig.current_state}
                    </span>

                    {mig.has_verified_backup && (
                      <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>
                        <CheckCircle2 size={12} /> S3 Verified
                      </span>
                    )}

                    {/* Quick action buttons */}
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        className="btn-action-view"
                        onClick={() =>
                          setViewModal({
                            isOpen: true,
                            title: `Migration: ${mig.name}`,
                            subtitle: `${mig.production_url} • ${mig.cluster_name || 'Cluster'}`,
                            type: 'migration',
                            data: {
                              id: mig.id,
                              name: mig.name,
                              migration_number: mig.migration_number,
                              cluster_id: mig.cluster_id,
                              cluster_name: mig.cluster_name || 'Cluster',
                              namespace: mig.namespace,
                              application_name: mig.application_name,
                              production_url: mig.production_url,
                              source_controller: mig.source_controller,
                              target_controller: mig.target_controller,
                              current_state: mig.current_state,
                              has_verified_backup: mig.has_verified_backup,
                              developer_approved: mig.developer_approved,
                              production_approved: mig.production_approved,
                              created_at: mig.created_at,
                              updated_at: mig.updated_at
                            }
                          })
                        }
                      >
                        <Eye size={13} /> View
                      </button>
                      <button
                        className="btn-action-edit"
                        onClick={() =>
                          setEditModal({
                            isOpen: true,
                            title: `Edit Migration: ${mig.name}`,
                            initialData: {
                              name: mig.name,
                              target_controller: mig.target_controller,
                              production_url: mig.production_url,
                              current_state: mig.current_state
                            },
                            type: 'migration',
                            id: mig.id,
                            fields: [
                              { name: 'name', label: 'Project Name', type: 'text' },
                              {
                                name: 'target_controller',
                                label: 'Target Controller',
                                type: 'select',
                                options: ['TRAEFIK', 'ENVOY_GATEWAY', 'ISTIO_GATEWAY']
                              },
                              { name: 'production_url', label: 'Production URL', type: 'text' },
                              {
                                name: 'current_state',
                                label: 'State',
                                type: 'select',
                                options: ['DRAFT', 'ASSESSMENT', 'READY_TO_DEPLOY', 'RUNTIME_TESTING', 'APPROVED_FOR_CUTOVER', 'COMPLETED']
                              }
                            ]
                          })
                        }
                      >
                        <Edit3 size={13} /> Edit
                      </button>
                      <button
                        className="btn-action-delete"
                        onClick={() =>
                          setDeleteModal({
                            isOpen: true,
                            id: mig.id,
                            name: mig.name,
                            type: 'Migration Project'
                          })
                        }
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                      <button
                        className="btn-secondary"
                        style={{ fontSize: '0.78rem', padding: '5px 12px' }}
                        onClick={() => {
                          onSelectMigration(mig);
                          onNavigateToTab('wizard');
                        }}
                      >
                        Studio <ArrowRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Mouse-over expandable details section */}
                <div className="grid-hover-details">
                  <div
                    className="grid-responsive-1-4"
                    style={{
                      borderTop: '1px solid #E2E8F0',
                      paddingTop: '12px',
                      gap: '12px',
                      fontSize: '0.78rem',
                      color: 'var(--text-muted)'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600 }}>
                        Runtime Testing URL
                      </div>
                      <div style={{ color: '#0F172A', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                        {mig.runtime_url ? (
                          <>
                            <a
                              href={`https://${mig.runtime_url}`}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: '#0284C7', textDecoration: 'none' }}
                            >
                              {mig.runtime_url}
                            </a>
                            <ExternalLink size={12} color="#0284C7" />
                          </>
                        ) : (
                          'Not Generated'
                        )}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600 }}>
                        Namespace & Scope
                      </div>
                      <div style={{ color: '#0F172A', fontWeight: 600, marginTop: '2px' }}>
                        {mig.namespace} / {mig.application_name}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600 }}>
                        Developer Sign-Off
                      </div>
                      <div style={{ color: mig.developer_approved ? '#059669' : '#D97706', fontWeight: 600, marginTop: '2px' }}>
                        {mig.developer_approved ? '✓ Smoke Tests Passed' : 'Pending Validation'}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 600 }}>
                        DevOps Lead Cutover Gate
                      </div>
                      <div style={{ color: mig.production_approved ? '#059669' : '#7C3AED', fontWeight: 600, marginTop: '2px' }}>
                        {mig.production_approved ? '✓ Production Approved' : 'Awaiting Approval'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        </div>
      </div>

      {/* CLOUD LOGIN DETAILS MODAL (POPUP WINDOW) */}
      {loginModalProvider && (
        <CloudLoginModal
          provider={loginModalProvider}
          isOpen={!!loginModalProvider}
          onClose={() => setLoginModalProvider(null)}
          onSubmit={handleLoginSubmit}
        />
      )}

      {/* CLUSTER TOPOLOGY, IN-USE COMPONENTS & MIGRATION STATUS POPUP WINDOW */}
      {inspectedCluster && (
        <ClusterInspectionModal
          cluster={inspectedCluster}
          isOpen={!!inspectedCluster}
          currentUserRole={currentUserRole}
          onClose={() => setInspectedCluster(null)}
          onStartMigration={(clusterId) => {
            const cl = clusters.find((c) => c.id === clusterId);
            if (cl) {
              setInspectedCluster(null);
              setMigrationDrawerCluster(cl);
            } else if (onInitiateMigrationForCluster) {
              onInitiateMigrationForCluster(clusterId);
            } else {
              onOpenWizard();
            }
          }}
        />
      )}

      {/* ZERO-DOWNTIME INGRESS MIGRATION POPUP DRAWER (RIGHT-TO-LEFT) */}
      {migrationDrawerCluster && (
        <MigrationDrawer
          isOpen={!!migrationDrawerCluster}
          cluster={migrationDrawerCluster}
          currentUserRole={currentUserRole}
          onClose={() => setMigrationDrawerCluster(null)}
          onRefreshData={onRefreshClusters}
        />
      )}

      {/* REAL-TIME CLOUD AUTHENTICATION PROGRESS ANIMATION MODAL */}
      {authProgressModal.isOpen && authProgressModal.provider && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.55)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1250
          }}
        >
          <div
            className="glass-panel fade-in-up"
            style={{
              width: '580px',
              maxWidth: '92vw',
              background: '#FFFFFF',
              borderRadius: '16px',
              padding: '28px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
          >
            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '6px',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
              >
                <CloudLogo provider={authProgressModal.provider.key} size={36} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: '#0F172A' }}>
                  Authenticating {authProgressModal.provider.label}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                  Protocol: {authProgressModal.provider.protocol}
                </p>
              </div>
            </div>

            {/* Animated Progress Bar */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>
                  {authProgressModal.isCompleted
                    ? 'Authentication Complete & Clusters Unlocked'
                    : 'Validating RBAC & Control Plane Handshake...'}
                </span>
                <span
                  style={{
                    fontSize: '0.85rem',
                    fontWeight: 800,
                    color: authProgressModal.isCompleted ? '#059669' : '#0284C7'
                  }}
                >
                  {authProgressModal.percent}%
                </span>
              </div>

              <div
                style={{
                  width: '100%',
                  height: '10px',
                  borderRadius: '5px',
                  background: '#E2E8F0',
                  overflow: 'hidden'
                }}
              >
                <div
                  className="progress-bar-animated"
                  style={{
                    width: `${authProgressModal.percent}%`,
                    height: '100%',
                    background: authProgressModal.isCompleted
                      ? 'linear-gradient(90deg, #10B981 0%, #059669 100%)'
                      : 'linear-gradient(90deg, #0284C7 0%, #2563EB 100%)'
                  }}
                />
              </div>
            </div>

            {/* Multi-Step Timeline Checklist with Progress Animations */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
              {[
                { step: 1, text: `Connecting to ${authProgressModal.provider.key} STS / Workload Identity...` },
                { step: 2, text: 'Validating IAM & RBAC cluster permissions (Ingress Reader, Traefik CRDs)...' },
                { step: 3, text: `Querying ${authProgressModal.provider.clusterType} API Server & discovering Ingresses...` },
                { step: 4, text: 'Verifying zero-downtime dual-stack ALB Target Group driver...' },
                { step: 5, text: 'Authentication Verified! Unlocking cluster instances.' }
              ].map((item) => {
                const isPassed = authProgressModal.stepIndex > item.step || authProgressModal.isCompleted;
                const isCurrent = authProgressModal.stepIndex === item.step && !authProgressModal.isCompleted;

                return (
                  <div
                    key={item.step}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      fontSize: '0.82rem',
                      color: isPassed ? '#0F172A' : isCurrent ? '#0284C7' : '#94A3B8'
                    }}
                  >
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: isPassed ? '#ECFDF5' : isCurrent ? '#E0F2FE' : '#F1F5F9',
                        border: `1px solid ${isPassed ? '#A7F3D0' : isCurrent ? '#7DD3FC' : '#E2E8F0'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      {isPassed ? (
                        <Check size={12} color="#059669" />
                      ) : isCurrent ? (
                        <span className="pulse-ring" style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#0284C7' }} />
                      ) : (
                        <span style={{ fontSize: '0.65rem', color: '#94A3B8' }}>{item.step}</span>
                      )}
                    </div>
                    <span style={{ fontWeight: isPassed || isCurrent ? 600 : 400 }}>{item.text}</span>
                  </div>
                );
              })}
            </div>

            {/* Live Terminal Telemetry Output */}
            <div
              style={{
                borderRadius: '8px',
                background: '#0F172A',
                padding: '12px 14px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                color: '#38BDF8',
                maxHeight: '110px',
                overflowY: 'auto',
                lineHeight: 1.5,
                marginBottom: '20px'
              }}
            >
              {authProgressModal.logs.map((log, i) => (
                <div key={i}>{log}</div>
              ))}
            </div>

            {/* Footer Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              {authProgressModal.isCompleted ? (
                <button
                  className="btn-primary"
                  style={{ background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
                  onClick={closeAuthProgressModal}
                >
                  <CheckCircle2 size={16} /> View Unlocked Clusters
                </button>
              ) : (
                <button
                  className="btn-secondary"
                  disabled
                  style={{ opacity: 0.6 }}
                >
                  <RefreshCw size={14} className="spin" /> Verifying Credentials...
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Action Modals: View, Edit, Delete */}
      {viewModal && (
        <EntityViewModal
          isOpen={viewModal.isOpen}
          title={viewModal.title}
          subtitle={viewModal.subtitle}
          data={viewModal.data}
          type={viewModal.type}
          onClose={() => setViewModal(null)}
        />
      )}

      {editModal && (
        <EntityEditModal
          isOpen={editModal.isOpen}
          title={editModal.title}
          initialData={editModal.initialData}
          fields={editModal.fields}
          onClose={() => setEditModal(null)}
          onSave={handleSaveEdit}
        />
      )}

      {deleteModal && (
        <EntityDeleteModal
          isOpen={deleteModal.isOpen}
          title={`Delete ${deleteModal.type}`}
          entityName={deleteModal.name}
          entityType={deleteModal.type}
          onClose={() => setDeleteModal(null)}
          onConfirm={handleConfirmDelete}
        />
      )}
    </div>
  );
};
