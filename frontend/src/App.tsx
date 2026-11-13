import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { ClusterExplorerView } from './components/ClusterExplorerView';
import { MigrationWizard } from './components/MigrationWizard';
import { DeveloperPortal } from './components/DeveloperPortal';
import { CutoverConsole } from './components/CutoverConsole';
import { DiffViewer } from './components/DiffViewer';
import { AuditExplorerView } from './components/AuditExplorerView';
import { IntegrationsView } from './components/IntegrationsView';
import { NewMigrationModal } from './components/NewMigrationModal';
import { api } from './services/api';
import { Migration, Cluster, DiscoveredIngress } from './types';
import { Layers, Plus } from 'lucide-react';

const EmptyMigrationView: React.FC<{
  title: string;
  description: string;
  onNewMigration: () => void;
  onGoDashboard: () => void;
}> = ({ title, description, onNewMigration, onGoDashboard }) => (
  <div
    className="glass-panel"
    style={{
      padding: '48px 32px',
      textAlign: 'center',
      background: '#FFFFFF',
      borderRadius: '16px',
      maxWidth: '640px',
      margin: '40px auto',
      boxShadow: 'var(--shadow-card)',
      border: '1px solid #E2E8F0'
    }}
  >
    <div
      style={{
        width: '56px',
        height: '56px',
        borderRadius: '14px',
        background: '#E0F2FE',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#0284C7',
        marginBottom: '16px'
      }}
    >
      <Layers size={28} />
    </div>
    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#0F172A', marginBottom: '8px' }}>
      No Active Migration Project Selected for {title}
    </h3>
    <p style={{ fontSize: '0.85rem', color: '#64748B', lineHeight: 1.5, marginBottom: '24px' }}>
      {description}
    </p>
    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
      <button
        onClick={onGoDashboard}
        className="btn-secondary"
        style={{ fontSize: '0.82rem', padding: '8px 16px' }}
      >
        Go to Dashboard
      </button>
      <button
        onClick={onNewMigration}
        className="btn-primary"
        style={{ fontSize: '0.82rem', padding: '8px 18px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
      >
        <Plus size={15} /> Create Migration Project
      </button>
    </div>
  </div>
);

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [currentRole, setCurrentRole] = useState<string>('DEVOPS_ENGINEER');
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [migrations, setMigrations] = useState<Migration[]>([]);
  const [selectedMigration, setSelectedMigration] = useState<Migration | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);

  // New Migration Modal State
  const [showNewMigModal, setShowNewMigModal] = useState<boolean>(false);
  const [modalInitialClusterId, setModalInitialClusterId] = useState<string>('');
  const [modalInitialIngress, setModalInitialIngress] = useState<DiscoveredIngress | null>(null);

  const loadData = async () => {
    const [cList, mList] = await Promise.all([api.getClusters(), api.getMigrations()]);
    setClusters(cList);
    setMigrations(mList);
    if (mList.length > 0 && !selectedMigration) {
      setSelectedMigration(mList[0]);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleInitiateMigrationFromExplorer = (clusterId: string, ingress: DiscoveredIngress) => {
    setModalInitialClusterId(clusterId);
    setModalInitialIngress(ingress);
    setShowNewMigModal(true);
  };

  const handleMigrationCreated = async (newMigrationId: string) => {
    setShowNewMigModal(false);
    await loadData();
    const found = (await api.getMigrations()).find((m) => m.id === newMigrationId);
    if (found) {
      setSelectedMigration(found);
    }
    setCurrentTab('wizard');
  };

  return (
    <div className="app-shell">
      <Navbar
        currentRole={currentRole}
        onRoleChange={setCurrentRole}
        onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
      />

      {mobileMenuOpen && (
        <div
          className="sidebar-backdrop-overlay"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="app-body-layout">
        <Sidebar
          currentTab={currentTab}
          onSelectTab={(tab) => {
            setCurrentTab(tab);
            setMobileMenuOpen(false);
          }}
          isMobileOpen={mobileMenuOpen}
          onCloseMobileMenu={() => setMobileMenuOpen(false)}
        />

        <main className="app-main-content">
          {currentTab === 'dashboard' && (
            <DashboardView
              migrations={migrations}
              clusters={clusters}
              currentUserRole={currentRole}
              onSelectMigration={(mig) => setSelectedMigration(mig)}
              onOpenWizard={() => {
                setModalInitialClusterId('');
                setModalInitialIngress(null);
                setShowNewMigModal(true);
              }}
              onNavigateToTab={(tab) => setCurrentTab(tab)}
              onRefreshMigrations={loadData}
              onRefreshClusters={loadData}
              onInitiateMigrationForCluster={(clusterId, ingress) => {
                setModalInitialClusterId(clusterId);
                setModalInitialIngress(ingress || null);
                setShowNewMigModal(true);
              }}
            />
          )}

          {currentTab === 'clusters' && (
            <ClusterExplorerView
              clusters={clusters}
              onRefreshClusters={loadData}
              onInitiateMigration={handleInitiateMigrationFromExplorer}
            />
          )}

          {currentTab === 'wizard' && (
            selectedMigration ? (
              <MigrationWizard
                migration={selectedMigration}
                clusters={clusters}
                onRefreshMigration={loadData}
                onNavigateToTab={(tab) => setCurrentTab(tab)}
              />
            ) : (
              <EmptyMigrationView
                title="Migration Studio Wizard"
                description="Select or initiate a migration project from the Dashboard or Clusters view to step through the 7-stage migration wizard."
                onNewMigration={() => setShowNewMigModal(true)}
                onGoDashboard={() => setCurrentTab('dashboard')}
              />
            )
          )}

          {currentTab === 'diff' && (
            selectedMigration ? (
              <DiffViewer migrationId={selectedMigration.id} />
            ) : (
              <EmptyMigrationView
                title="AST Diff & CRD Preview"
                description="No migration project is active. Create or select a migration project to inspect the AST diff and generated Traefik IngressRoute YAML."
                onNewMigration={() => setShowNewMigModal(true)}
                onGoDashboard={() => setCurrentTab('dashboard')}
              />
            )
          )}

          {currentTab === 'developer' && (
            selectedMigration ? (
              <DeveloperPortal migration={selectedMigration} onRefresh={loadData} />
            ) : (
              <EmptyMigrationView
                title="Developer Smoke Testing"
                description="No migration project is active. Create or select a migration project to run curl smoke tests and verify shadow runtime endpoints."
                onNewMigration={() => setShowNewMigModal(true)}
                onGoDashboard={() => setCurrentTab('dashboard')}
              />
            )
          )}

          {currentTab === 'cutover' && (
            selectedMigration ? (
              <CutoverConsole migration={selectedMigration} onRefresh={loadData} />
            ) : (
              <EmptyMigrationView
                title="0-Downtime Production Cutover"
                description="No migration project is active. Create or select a migration project to authorize production cutover and execute traffic migration."
                onNewMigration={() => setShowNewMigModal(true)}
                onGoDashboard={() => setCurrentTab('dashboard')}
              />
            )
          )}

          {currentTab === 'audit' && <AuditExplorerView />}

          {currentTab === 'integrations' && <IntegrationsView />}
        </main>
      </div>

      {showNewMigModal && (
        <NewMigrationModal
          clusters={clusters}
          initialClusterId={modalInitialClusterId}
          initialIngress={modalInitialIngress}
          onClose={() => setShowNewMigModal(false)}
          onSuccess={handleMigrationCreated}
        />
      )}
    </div>
  );
}

export default App;
