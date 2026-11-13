import React, { useState } from 'react';
import { Eye, Edit3, Trash2, X, Check, AlertTriangle, Copy, Server, ExternalLink, ShieldAlert, Cpu } from 'lucide-react';

interface EntityViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  data: Record<string, any>;
  type: 'cluster' | 'migration' | 'ingress' | 'integration' | 'metric';
}

export const EntityViewModal: React.FC<EntityViewModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  data,
  type
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'json'>('overview');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '680px',
          maxHeight: '85vh',
          background: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(226, 232, 240, 1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(to right, #F8FAFC, #FFFFFF)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#E0F2FE',
                color: '#0284C7',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {type === 'cluster' ? <Server size={20} /> : type === 'integration' ? <Cpu size={20} /> : <Eye size={20} />}
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0F172A', fontWeight: 700 }}>{title}</h3>
              {subtitle && <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748B' }}>{subtitle}</p>}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              color: '#64748B',
              display: 'flex'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', gap: '10px', padding: '12px 24px 0', borderBottom: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setActiveTab('overview')}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'overview' ? '2px solid #0284C7' : '2px solid transparent',
              color: activeTab === 'overview' ? '#0284C7' : '#64748B',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Details Overview
          </button>
          <button
            onClick={() => setActiveTab('json')}
            style={{
              padding: '8px 16px',
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'json' ? '2px solid #0284C7' : '2px solid transparent',
              color: activeTab === 'json' ? '#0284C7' : '#64748B',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer'
            }}
          >
            Raw Configuration & Spec
          </button>
        </div>

        {/* Body Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {activeTab === 'overview' ? (
            <div className="grid-responsive-1-2" style={{ gap: '16px' }}>
              {Object.entries(data).map(([key, val]) => {
                if (typeof val === 'object' && val !== null && !Array.isArray(val)) return null;
                const displayVal = Array.isArray(val) ? val.join(', ') : String(val);
                return (
                  <div
                    key={key}
                    style={{
                      padding: '12px 14px',
                      background: '#F8FAFC',
                      borderRadius: '8px',
                      border: '1px solid #E2E8F0'
                    }}
                  >
                    <div style={{ fontSize: '0.72rem', color: '#64748B', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.04em' }}>
                      {key.replace(/_/g, ' ')}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#0F172A', fontWeight: 600, marginTop: '4px', wordBreak: 'break-all' }}>
                      {displayVal || '—'}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <button
                onClick={handleCopy}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  padding: '6px 12px',
                  background: '#FFFFFF',
                  border: '1px solid #CBD5E1',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: '#0F172A',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {copied ? <Check size={14} color="#059669" /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy JSON'}
              </button>
              <pre
                style={{
                  background: '#0F172A',
                  color: '#38BDF8',
                  padding: '16px',
                  borderRadius: '10px',
                  fontSize: '0.8rem',
                  fontFamily: 'var(--font-mono)',
                  overflowX: 'auto',
                  maxHeight: '380px'
                }}
              >
                {JSON.stringify(data, null, 2)}
              </pre>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'flex-end',
            background: '#F8FAFC'
          }}
        >
          <button className="btn-secondary" onClick={onClose} style={{ fontSize: '0.85rem' }}>
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};

interface EntityEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  initialData: Record<string, any>;
  onSave: (updatedData: Record<string, any>) => Promise<void>;
  fields: { name: string; label: string; type?: 'text' | 'select'; options?: string[] }[];
}

export const EntityEditModal: React.FC<EntityEditModalProps> = ({
  isOpen,
  onClose,
  title,
  initialData,
  onSave,
  fields
}) => {
  const [formData, setFormData] = useState<Record<string, any>>(initialData);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleChange = (name: string, value: any) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);
    try {
      await onSave(formData);
      setFeedback('Changes successfully saved!');
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setFeedback(err?.message || 'Failed to update entity');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '560px',
          background: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(226, 232, 240, 1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(to right, #FFFBEB, #FFFFFF)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#FEF3C7',
                color: '#D97706',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Edit3 size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#0F172A', fontWeight: 700 }}>{title}</h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#64748B' }}>Modify configuration parameters</p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: '#F1F5F9',
              border: 'none',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer',
              color: '#64748B',
              display: 'flex'
            }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {feedback && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                background: feedback.includes('success') ? '#ECFDF5' : '#FEF2F2',
                color: feedback.includes('success') ? '#059669' : '#DC2626',
                fontSize: '0.825rem',
                fontWeight: 600,
                border: `1px solid ${feedback.includes('success') ? '#A7F3D0' : '#FECDD3'}`
              }}
            >
              {feedback}
            </div>
          )}

          {fields.map((f) => (
            <div key={f.name}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                {f.label}
              </label>
              {f.type === 'select' && f.options ? (
                <select
                  value={formData[f.name] || ''}
                  onChange={(e) => handleChange(f.name, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem'
                  }}
                >
                  {f.options.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={formData[f.name] || ''}
                  onChange={(e) => handleChange(f.name, e.target.value)}
                  style={{
                    width: '100%',
                    padding: '9px 12px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '0.85rem'
                  }}
                  required
                />
              )}
            </div>
          ))}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isSaving}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={isSaving}>
              {isSaving ? 'Saving Changes...' : 'Save Updates'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface EntityDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityName: string;
  entityType: string;
  title?: string;
  onConfirmDelete?: () => Promise<void>;
  onConfirm?: () => Promise<void>;
}

export const EntityDeleteModal: React.FC<EntityDeleteModalProps> = ({
  isOpen,
  onClose,
  entityName,
  entityType,
  title,
  onConfirmDelete,
  onConfirm
}) => {
  const [isDeleting, setIsDeleting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      if (onConfirmDelete) {
        await onConfirmDelete();
      } else if (onConfirm) {
        await onConfirm();
      }
      onClose();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.45)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '480px',
          background: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 20px 40px -10px rgba(15, 23, 42, 0.2), 0 0 0 1px rgba(226, 232, 240, 1)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: '24px 24px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '14px' }}>
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '12px',
                background: '#FEE2E2',
                color: '#DC2626',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}
            >
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#0F172A', fontWeight: 700 }}>
                Delete {entityType}
              </h3>
              <p style={{ margin: '2px 0 0', fontSize: '0.825rem', color: '#64748B' }}>
                Zero-Downtime Safeguard Verification
              </p>
            </div>
          </div>

          <p style={{ fontSize: '0.875rem', color: '#334155', lineHeight: 1.5 }}>
            Are you sure you want to delete <strong style={{ color: '#0F172A' }}>{entityName}</strong>?
          </p>

          <div
            style={{
              marginTop: '14px',
              padding: '12px',
              borderRadius: '8px',
              background: '#FFF1F2',
              border: '1px solid #FECDD3',
              fontSize: '0.8rem',
              color: '#9F1239',
              display: 'flex',
              gap: '8px'
            }}
          >
            <ShieldAlert size={18} style={{ flexShrink: 0 }} />
            <div>
              <strong>Production Impact Notice:</strong> Live ingress routing and active ALB target groups are safeguarded. Deleting this entity removes tracking configuration from KMM.
            </div>
          </div>
        </div>

        <div
          style={{
            padding: '16px 24px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '10px',
            background: '#F8FAFC'
          }}
        >
          <button className="btn-secondary" onClick={onClose} disabled={isDeleting}>
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: '#DC2626',
              color: '#FFFFFF',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            disabled={isDeleting}
          >
            <Trash2 size={15} />
            {isDeleting ? 'Deleting...' : `Confirm Delete`}
          </button>
        </div>
      </div>
    </div>
  );
};
