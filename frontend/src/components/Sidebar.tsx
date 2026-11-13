import React from 'react';
import {
  LayoutDashboard,
  Server,
  GitMerge,
  FileCode,
  CheckSquare,
  Zap,
  ShieldCheck,
  Cpu,
  Activity,
  X
} from 'lucide-react';

interface SidebarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  isMobileOpen?: boolean;
  onCloseMobileMenu?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab, isMobileOpen, onCloseMobileMenu }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'clusters', label: 'Cluster Explorer', icon: Server, badge: 'Live' },
    { id: 'wizard', label: 'Migration Studio', icon: GitMerge, badge: 'Active' },
    { id: 'diff', label: 'YAML Diff Viewer', icon: FileCode },
    { id: 'developer', label: 'Developer Portal', icon: CheckSquare, badge: 'Gate' },
    { id: 'cutover', label: 'Cutover & Rollback', icon: Zap, badge: '0-Down' },
    { id: 'audit', label: 'Audit Explorer', icon: ShieldCheck },
    { id: 'integrations', label: 'Cloud Integrations', icon: Cpu },
  ];

  return (
    <aside className={`app-sidebar-container ${isMobileOpen ? 'is-mobile-open' : ''}`}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px' }}>
        <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          KMM Navigation
        </div>
        {onCloseMobileMenu && (
          <button
            type="button"
            className="mobile-sidebar-close-btn"
            onClick={onCloseMobileMenu}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => {
              onSelectTab(item.id);
              if (onCloseMobileMenu) onCloseMobileMenu();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '11px 16px',
              borderRadius: '10px',
              background: isActive
                ? '#EFF6FF'
                : 'transparent',
              border: isActive ? '1px solid #BAE6FD' : '1px solid transparent',
              color: isActive ? '#0284C7' : 'var(--text-muted)',
              fontWeight: isActive ? 700 : 500,
              fontSize: '0.85rem',
              cursor: 'pointer',
              textAlign: 'left',
              transition: 'all 0.2s ease',
              boxShadow: isActive ? '0 2px 6px rgba(2, 132, 199, 0.12)' : 'none'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Icon size={18} color={isActive ? '#0284C7' : 'var(--text-dim)'} />
              <span>{item.label}</span>
            </div>
            {item.badge && (
              <span className={isActive ? 'badge badge-info' : 'badge badge-purple'} style={{ fontSize: '0.62rem' }}>
                {item.badge}
              </span>
            )}
          </button>
        );
      })}

      {/* Target SLA Card */}
      <div className="glass-panel" style={{ marginTop: 'auto', marginBottom: '24px', padding: '16px', background: '#FFFFFF', border: '1px solid #E2E8F0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <Activity size={16} color="var(--accent-emerald)" />
          <span style={{ fontSize: '0.825rem', fontWeight: 700, color: 'var(--text-main)' }}>Zero-Downtime Guarantee</span>
        </div>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
          NGINX serves 100% of live traffic during parallel Traefik validation. Instant rollback plan verified.
        </p>
      </div>
    </aside>
  );
};
