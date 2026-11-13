import React, { useState } from 'react';
import {
  ShieldCheck,
  User,
  Users,
  UserCheck,
  UserX,
  Plus,
  X,
  Check,
  CheckCircle2,
  Lock,
  Key,
  Shield,
  Layers,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { CloudLogo } from './CloudLogo';

export interface PlatformUser {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'DEVOPS_ENGINEER' | 'DEVOPS_LEAD' | 'DEVELOPER' | 'AUDITOR';
  cloudAccess: string[];
  status: 'ACTIVE' | 'SUSPENDED';
  lastActive: string;
}

interface UserAccessModalProps {
  isOpen: boolean;
  currentUserRole: string;
  onClose: () => void;
}

export const UserAccessModal: React.FC<UserAccessModalProps> = ({
  isOpen,
  currentUserRole,
  onClose
}) => {
  const [users, setUsers] = useState<PlatformUser[]>([
    {
      id: 'usr-current',
      name:
        currentUserRole === 'ADMIN'
          ? 'Platform Superuser (Admin)'
          : currentUserRole === 'DEVOPS_LEAD'
            ? 'DevOps Lead Engineer'
            : currentUserRole === 'DEVOPS_ENGINEER'
              ? 'DevOps Engineer'
              : currentUserRole === 'DEVELOPER'
                ? 'Application Developer'
                : 'Compliance Auditor',
      email: `${currentUserRole.toLowerCase().replace(/_/g, '.')}@corp.internal`,
      role: (currentUserRole as PlatformUser['role']) || 'ADMIN',
      cloudAccess: ['AWS', 'Azure', 'GCP', 'On-Premises'],
      status: 'ACTIVE',
      lastActive: 'Active Session'
    }
  ]);

  const [activeTab, setActiveTab] = useState<'users' | 'matrix' | 'add'>('users');
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: 'DEVELOPER' as PlatformUser['role'],
    cloudAccess: ['AWS']
  });
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const canManageAccess = currentUserRole === 'ADMIN' || currentUserRole === 'DEVOPS_LEAD' || currentUserRole === 'DEVOPS_ENGINEER';

  const handleRoleChange = (userId: string, newRole: PlatformUser['role']) => {
    setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    setSuccessMessage(`Updated user role to ${newRole}`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const handleToggleStatus = (userId: string) => {
    setUsers(users.map(u => u.id === userId ? { ...u, status: u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE' } : u));
  };

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.name || !newUser.email) return;

    const created: PlatformUser = {
      id: `usr-${Date.now()}`,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      cloudAccess: newUser.cloudAccess,
      status: 'ACTIVE',
      lastActive: 'Never'
    };

    setUsers([...users, created]);
    setNewUser({ name: '', email: '', role: 'DEVELOPER', cloudAccess: ['AWS'] });
    setActiveTab('users');
    setSuccessMessage(`User ${created.name} successfully provisioned.`);
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  const roleBadges: Record<string, { label: string; color: string; bg: string; border: string }> = {
    ADMIN: { label: 'Platform Admin', color: '#9333EA', bg: '#FAF5FF', border: '#E9D5FF' },
    DEVOPS_ENGINEER: { label: 'DevOps Engineer', color: '#0284C7', bg: '#F0F9FF', border: '#BAE6FD' },
    DEVOPS_LEAD: { label: 'DevOps Lead', color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    DEVELOPER: { label: 'Developer', color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    AUDITOR: { label: 'Auditor', color: '#475569', bg: '#F8FAFC', border: '#CBD5E1' }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15, 23, 42, 0.55)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1400
      }}
      onClick={onClose}
    >
      <div
        className="fade-in-up modal-responsive-dialog"
        style={{
          width: 'min(760px, 95vw)',
          maxWidth: '95vw',
          maxHeight: '90vh',
          background: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 20px 45px rgba(15, 23, 42, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid #E2E8F0'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E2E8F0',
            background: 'linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)'
              }}
            >
              <Users size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0F172A' }}>
                User Access & Permissions Management
              </h3>
              <p style={{ margin: '2px 0 0 0', fontSize: '0.76rem', color: '#64748B' }}>
                Role-Based Access Control (RBAC) • Multi-Cloud Cluster Permissions
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '8px',
              padding: '7px',
              cursor: 'pointer',
              color: '#64748B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', borderBottom: '1px solid #E2E8F0', padding: '0 24px', background: '#FFFFFF', gap: '8px' }}>
          <button
            onClick={() => setActiveTab('users')}
            style={{
              padding: '11px 16px',
              border: 'none',
              background: 'transparent',
              fontSize: '0.80rem',
              fontWeight: 700,
              cursor: 'pointer',
              color: activeTab === 'users' ? '#7C3AED' : '#64748B',
              borderBottom: activeTab === 'users' ? '3px solid #7C3AED' : '3px solid transparent'
            }}
          >
            Users & Roles ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('matrix')}
            style={{
              padding: '11px 16px',
              border: 'none',
              background: 'transparent',
              fontSize: '0.80rem',
              fontWeight: 700,
              cursor: 'pointer',
              color: activeTab === 'matrix' ? '#7C3AED' : '#64748B',
              borderBottom: activeTab === 'matrix' ? '3px solid #7C3AED' : '3px solid transparent'
            }}
          >
            Permissions Matrix
          </button>
          {canManageAccess && (
            <button
              onClick={() => setActiveTab('add')}
              style={{
                padding: '11px 16px',
                border: 'none',
                background: 'transparent',
                fontSize: '0.80rem',
                fontWeight: 700,
                cursor: 'pointer',
                color: activeTab === 'add' ? '#7C3AED' : '#64748B',
                borderBottom: activeTab === 'add' ? '3px solid #7C3AED' : '3px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Plus size={13} /> Provision User
            </button>
          )}
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div style={{ margin: '12px 24px 0 24px', padding: '8px 14px', borderRadius: '8px', background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={13} color="#059669" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Read-Only Notice for Non-Admins */}
        {!canManageAccess && (
          <div style={{ margin: '12px 24px 0 24px', padding: '10px 14px', borderRadius: '8px', background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Lock size={15} color="#D97706" style={{ flexShrink: 0 }} />
            <span>
              <strong>Read-Only Mode:</strong> Only Platform Admins and DevOps Leads have privileges to modify user roles, suspend accounts, and provision new users. Your current session is <strong>{currentUserRole}</strong>.
            </span>
          </div>
        )}

        {/* Modal Body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          {/* TAB 1: USERS LIST */}
          {activeTab === 'users' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.76rem', color: '#64748B' }}>
                  Current user session: <strong>{currentUserRole}</strong> • Access level: <strong>{canManageAccess ? 'Manage Permitted' : 'Read Only'}</strong>
                </span>
                <span className="badge badge-info" style={{ fontSize: '0.66rem' }}>
                  {users.filter(u => u.status === 'ACTIVE').length} Active Accounts
                </span>
              </div>

              <div className="table-responsive-container" style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700 }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left' }}>User Name & Email</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Assigned Role</th>
                      <th style={{ padding: '10px 12px', textAlign: 'left' }}>Cloud Scope</th>
                      <th style={{ padding: '10px 10px', textAlign: 'center' }}>Status</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => {
                      const badge = roleBadges[u.role] || roleBadges.DEVELOPER;
                      return (
                        <tr key={u.id} style={{ borderBottom: '1px solid #F1F5F9', background: u.status === 'SUSPENDED' ? '#FAFAFA' : '#FFFFFF' }}>
                          <td style={{ padding: '10px 14px', textAlign: 'left', verticalAlign: 'middle' }}>
                            <div style={{ fontWeight: 700, color: '#0F172A' }}>{u.name}</div>
                            <div style={{ fontSize: '0.66rem', color: '#64748B' }}>{u.email}</div>
                          </td>

                          <td style={{ padding: '10px 12px', textAlign: 'left', verticalAlign: 'middle' }}>
                            {canManageAccess ? (
                              <select
                                value={u.role}
                                onChange={(e) => handleRoleChange(u.id, e.target.value as PlatformUser['role'])}
                                style={{
                                  padding: '3px 7px',
                                  borderRadius: '6px',
                                  fontSize: '0.68rem',
                                  fontWeight: 700,
                                  background: badge.bg,
                                  color: badge.color,
                                  border: `1px solid ${badge.border}`,
                                  cursor: 'pointer',
                                  outline: 'none'
                                }}
                              >
                                <option value="ADMIN">Platform Admin</option>
                                <option value="DEVOPS_ENGINEER">DevOps Engineer</option>
                                <option value="DEVOPS_LEAD">DevOps Lead</option>
                                <option value="DEVELOPER">Developer</option>
                                <option value="AUDITOR">Auditor</option>
                              </select>
                            ) : (
                              <span
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: '4px',
                                  fontSize: '0.66rem',
                                  fontWeight: 700,
                                  background: badge.bg,
                                  color: badge.color,
                                  border: `1px solid ${badge.border}`
                                }}
                              >
                                {badge.label}
                              </span>
                            )}
                          </td>

                          <td style={{ padding: '10px 12px', textAlign: 'left', verticalAlign: 'middle' }}>
                            <div style={{ display: 'flex', gap: '4px' }}>
                              {u.cloudAccess.map(c => (
                                <CloudLogo key={c} provider={c} size={15} />
                              ))}
                            </div>
                          </td>

                          <td style={{ padding: '10px 10px', textAlign: 'center', verticalAlign: 'middle' }}>
                            <span
                              style={{
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '0.62rem',
                                fontWeight: 700,
                                background: u.status === 'ACTIVE' ? '#ECFDF5' : '#FEF2F2',
                                color: u.status === 'ACTIVE' ? '#059669' : '#DC2626',
                                border: `1px solid ${u.status === 'ACTIVE' ? '#A7F3D0' : '#FECACA'}`
                              }}
                            >
                              {u.status}
                            </span>
                          </td>

                          <td style={{ padding: '10px 14px', textAlign: 'right', verticalAlign: 'middle' }}>
                            {canManageAccess && (
                              <button
                                onClick={() => handleToggleStatus(u.id)}
                                style={{
                                  padding: '3px 8px',
                                  borderRadius: '5px',
                                  border: '1px solid #CBD5E1',
                                  background: '#FFFFFF',
                                  color: u.status === 'ACTIVE' ? '#DC2626' : '#059669',
                                  fontSize: '0.65rem',
                                  cursor: 'pointer',
                                  fontWeight: 600
                                }}
                              >
                                {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 2: PERMISSIONS MATRIX */}
          {activeTab === 'matrix' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ fontSize: '0.74rem', color: '#64748B' }}>
                Governance and role capability matrix for all zero-downtime Kubernetes operations:
              </div>

              <div className="table-responsive-container" style={{ border: '1px solid #E2E8F0', borderRadius: '10px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.72rem' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '1px solid #E2E8F0', color: '#64748B', fontWeight: 700 }}>
                      <th style={{ padding: '9px 12px', textAlign: 'left' }}>Operation Capability</th>
                      <th style={{ padding: '9px 8px', textAlign: 'center' }}>Admin</th>
                      <th style={{ padding: '9px 8px', textAlign: 'center' }}>DevOps Eng</th>
                      <th style={{ padding: '9px 8px', textAlign: 'center' }}>DevOps Lead</th>
                      <th style={{ padding: '9px 8px', textAlign: 'center' }}>Developer</th>
                      <th style={{ padding: '9px 8px', textAlign: 'center' }}>Auditor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { cap: 'Authenticate Cloud Providers (AWS, Azure, GCP)', admin: true, eng: true, lead: true, dev: false, audit: false },
                      { cap: 'Inspect Topology, Nodes & Active Pods', admin: true, eng: true, lead: true, dev: true, audit: true },
                      { cap: 'Launch Ingress Migration Engine (7 Stages)', admin: true, eng: true, lead: true, dev: false, audit: false },
                      { cap: 'AST Translation & Side-by-Side YAML Diff', admin: true, eng: true, lead: true, dev: true, audit: true },
                      { cap: 'Cryptographic S3 Backup Checksum Verification', admin: true, eng: true, lead: true, dev: false, audit: true },
                      { cap: 'Stage 6 Dual Approval Sign-Off Gate', admin: true, eng: false, lead: true, dev: false, audit: false },
                      { cap: 'Execute Live Traffic Cutover & Canary Shift', admin: true, eng: true, lead: true, dev: false, audit: false },
                      { cap: 'Manage User Access & Roles (RBAC)', admin: true, eng: false, lead: true, dev: false, audit: false }
                    ].map((row, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 600, color: '#0F172A' }}>
                          {row.cap}
                        </td>
                        <td style={{ padding: '9px 8px', textAlign: 'center' }}>{row.admin ? <Check size={13} color="#059669" /> : <X size={13} color="#CBD5E1" />}</td>
                        <td style={{ padding: '9px 8px', textAlign: 'center' }}>{row.eng ? <Check size={13} color="#059669" /> : <X size={13} color="#CBD5E1" />}</td>
                        <td style={{ padding: '9px 8px', textAlign: 'center' }}>{row.lead ? <Check size={13} color="#059669" /> : <X size={13} color="#CBD5E1" />}</td>
                        <td style={{ padding: '9px 8px', textAlign: 'center' }}>{row.dev ? <Check size={13} color="#059669" /> : <X size={13} color="#CBD5E1" />}</td>
                        <td style={{ padding: '9px 8px', textAlign: 'center' }}>{row.audit ? <Check size={13} color="#059669" /> : <X size={13} color="#CBD5E1" />}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: PROVISION NEW USER */}
          {activeTab === 'add' && canManageAccess && (
            <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '14px', maxWidth: '480px', margin: '0 auto' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. David Miller"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.78rem', outline: 'none' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                  Corporate Email
                </label>
                <input
                  type="email"
                  placeholder="david.miller@corp.internal"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.78rem', outline: 'none' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: 700, color: '#0F172A', marginBottom: '4px' }}>
                  Assigned RBAC Role
                </label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as PlatformUser['role'] })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '0.78rem', outline: 'none', background: '#FFFFFF' }}
                >
                  <option value="DEVELOPER">Developer (Testing & Read-Only Topology)</option>
                  <option value="DEVOPS_ENGINEER">DevOps Engineer (Full Migration Execution)</option>
                  <option value="DEVOPS_LEAD">DevOps Lead (Dual Approval Sign-Off Authority)</option>
                  <option value="AUDITOR">Auditor (Compliance & Checksum Audit)</option>
                  <option value="ADMIN">Platform Admin (Full System & User Control)</option>
                </select>
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{
                  padding: '10px',
                  justifyContent: 'center',
                  background: 'linear-gradient(135deg, #7C3AED 0%, #4F46E5 100%)',
                  marginTop: '10px',
                  fontSize: '0.80rem'
                }}
              >
                <Plus size={14} /> Provision User Account
              </button>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #E2E8F0', background: '#F8FAFC', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-secondary" style={{ fontSize: '0.75rem', padding: '7px 16px' }} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
