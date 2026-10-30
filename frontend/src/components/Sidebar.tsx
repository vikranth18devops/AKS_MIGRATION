import React from 'react';
import { LayoutDashboard, Compass, GitMerge, FileCode, CheckSquare, Zap, Activity, ShieldAlert, Cpu } from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'wizard', label: 'Migration Studio', icon: GitMerge, badge: 'Active' },
    { id: 'diff', label: 'YAML Diff Viewer', icon: FileCode },
    { id: 'developer', label: 'Developer Portal', icon: CheckSquare, badge: 'Gate' },
    { id: 'cutover', label: 'Cutover & Rollback', icon: Zap, badge: '0-Down' },
    { id: 'integrations', label: 'Cloud Integrations', icon: Cpu },
  ];

  return (
    <aside style={{ width: '250px', padding: '0 0 0 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ padding: '8px 12px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        Navigation
      </div>
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onSelectTab(item.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderRadius: '10px',
              background: isActive ? 'linear-gradient(90deg, rgba(6, 182, 212, 0.15) 0%, rgba(99, 102, 241, 0.08) 100%)' : 'transparent',
              border: isActive ? '1px solid var(--border-highlight)' : '1px solid transparent',
              color: isActive ? '#FFFFFF' : 'var(--text-muted)',
              fontWeight: isActive ? 600 : 500,
              fontSize: '0.875rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Icon size={18} color={isActive ? 'var(--accent-cyan)' : 'var(--text-dim)'} />
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span className={isActive ? 'badge badge-info' : 'badge badge-purple'} style={{ fontSize: '0.65rem' }}>
                {item.badge}
              </span>
            )}
          </button>
        );
      })}

      {/* SLA & Principle Card */}
      <div className="glass-panel" style={{ marginTop: 'auto', marginBottom: '24px', padding: '16px', background: 'rgba(15, 23, 42, 0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Activity size={16} color="var(--accent-emerald)" />
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#FFFFFF' }}>Target: 0s Downtime</span>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          NGINX serves 100% of production traffic until developer approval & AWS ALB cutover.
        </p>
      </div>
    </aside>
  );
};
