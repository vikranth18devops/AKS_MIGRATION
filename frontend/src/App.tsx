import React, { useEffect, useState } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { MigrationWizard } from './components/MigrationWizard';
import { DeveloperPortal } from './components/DeveloperPortal';
import { CutoverConsole } from './components/CutoverConsole';
import { DiffViewer } from './components/DiffViewer';
import { IntegrationsView } from './components/IntegrationsView';
import { api } from './services/api';
import { Migration, Cluster } from './types';

export function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [currentRole, setCurrentRole] = useState<string>('DEVOPS_ENGINEER');
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [migrations, setMigrations] = useState<Migration[]>([]);
  const [selectedMigration, setSelectedMigration] = useState<Migration | null>(null);

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

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar currentRole={currentRole} onRoleChange={setCurrentRole} />

      <div style={{ display: 'flex', flex: 1, padding: '0 24px 24px 0' }}>
        <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

        <main style={{ flex: 1, paddingLeft: '24px' }}>
          {currentTab === 'dashboard' && (
            <DashboardView
              migrations={migrations}
              clusters={clusters}
              onSelectMigration={(mig) => setSelectedMigration(mig)}
              onOpenWizard={() => setCurrentTab('wizard')}
              onNavigateToTab={(tab) => setCurrentTab(tab)}
            />
          )}

          {currentTab === 'wizard' && selectedMigration && (
            <MigrationWizard
              migration={selectedMigration}
              clusters={clusters}
              onRefreshMigration={loadData}
              onNavigateToTab={(tab) => setCurrentTab(tab)}
            />
          )}

          {currentTab === 'diff' && selectedMigration && (
            <DiffViewer migrationId={selectedMigration.id} />
          )}

          {currentTab === 'developer' && selectedMigration && (
            <DeveloperPortal migration={selectedMigration} onRefresh={loadData} />
          )}

          {currentTab === 'cutover' && selectedMigration && (
            <CutoverConsole migration={selectedMigration} onRefresh={loadData} />
          )}

          {currentTab === 'integrations' && <IntegrationsView />}
        </main>
      </div>
    </div>
  );
}

export default App;
