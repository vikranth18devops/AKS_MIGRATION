import React, { useState } from 'react';
import { Key, Lock, ShieldCheck, X, ArrowRight, CheckCircle2, AlertTriangle, RefreshCw, Server, Terminal, Shield, Network, Upload, FileCode, Check } from 'lucide-react';
import { CloudLogo } from './CloudLogo';

export interface CloudProviderLoginConfig {
  key: 'AWS' | 'Azure' | 'GCP' | 'On-Premises';
  label: string;
  clusterType: string;
  icon: string;
  color: string;
  defaultIdentity: string;
}

interface CloudLoginModalProps {
  provider: CloudProviderLoginConfig;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (credentials: Record<string, any>) => void;
  isAuthenticating?: boolean;
}

export const CloudLoginModal: React.FC<CloudLoginModalProps> = ({
  provider,
  isOpen,
  onClose,
  onSubmit,
  isAuthenticating = false
}) => {
  // ================= AWS FORM STATE =================
  const [awsAccountId, setAwsAccountId] = useState('');
  const [awsAccessKeyId, setAwsAccessKeyId] = useState('');
  const [awsSecretAccessKey, setAwsSecretAccessKey] = useState('');
  const [awsRoleArn, setAwsRoleArn] = useState('');
  const [awsSessionToken, setAwsSessionToken] = useState('');
  const [awsRegion, setAwsRegion] = useState('');
  const [awsRequiredPermissions, setAwsRequiredPermissions] = useState('');
  const [awsClusterName, setAwsClusterName] = useState('');

  // ================= AZURE FORM STATE =================
  const [azureTenantId, setAzureTenantId] = useState('');
  const [azureSubscriptionId, setAzureSubscriptionId] = useState('');
  const [azureClientId, setAzureClientId] = useState('');
  const [azureClientSecret, setAzureClientSecret] = useState('');
  const [azureResourceGroup, setAzureResourceGroup] = useState('');
  const [azureRbacRoles, setAzureRbacRoles] = useState('');
  const [azureClusterName, setAzureClusterName] = useState('');

  // ================= GCP FORM STATE =================
  const [gcpProjectId, setGcpProjectId] = useState('');
  const [gcpServiceAccountEmail, setGcpServiceAccountEmail] = useState('');
  const [gcpServiceAccountJson, setGcpServiceAccountJson] = useState<Record<string, any> | null>(null);
  const [gcpJsonFileName, setGcpJsonFileName] = useState('');
  const [gcpJsonError, setGcpJsonError] = useState('');
  const [gcpRegion, setGcpRegion] = useState('');
  const [gcpJsonRawText, setGcpJsonRawText] = useState('');
  const [showJsonPasteMode, setShowJsonPasteMode] = useState(false);

  const handleGcpJsonFileSelect = (file: File) => {
    setGcpJsonError('');
    setGcpJsonFileName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        setGcpJsonRawText(text);
        const parsed = JSON.parse(text);
        if (!parsed || parsed.type !== 'service_account' || !parsed.project_id) {
          throw new Error("Invalid GCP Service Account key. JSON must contain 'type': 'service_account' and 'project_id'.");
        }
        setGcpServiceAccountJson(parsed);
        setGcpProjectId(parsed.project_id || '');
        setGcpServiceAccountEmail(parsed.client_email || '');
      } catch (err: any) {
        setGcpJsonError(err.message || 'Failed to parse JSON file');
        setGcpServiceAccountJson(null);
      }
    };
    reader.onerror = () => {
      setGcpJsonError('Failed to read file from disk');
    };
    reader.readAsText(file);
  };

  const handleGcpJsonRawTextChange = (text: string) => {
    setGcpJsonRawText(text);
    setGcpJsonError('');
    if (!text.trim()) {
      setGcpServiceAccountJson(null);
      return;
    }
    try {
      const parsed = JSON.parse(text);
      if (parsed && parsed.type === 'service_account' && parsed.project_id) {
        setGcpServiceAccountJson(parsed);
        setGcpProjectId(parsed.project_id);
        setGcpServiceAccountEmail(parsed.client_email || '');
        setGcpJsonFileName('Pasted Service Account JSON');
      }
    } catch (_) {
      // User may still be pasting
    }
  };

  // ================= ON-PREMISES FORM STATE =================
  const [onpremServerHostnameIp, setOnpremServerHostnameIp] = useState('');
  const [onpremDomainName, setOnpremDomainName] = useState('');
  const [onpremUsername, setOnpremUsername] = useState('');
  const [onpremPassword, setOnpremPassword] = useState('');
  const [onpremDomainController, setOnpremDomainController] = useState('');
  const [onpremAuthProtocol, setOnpremAuthProtocol] = useState<'Kerberos' | 'LDAP' | 'LDAPS' | 'NTLM'>('LDAPS');
  const [onpremSshKey, setOnpremSshKey] = useState('');
  const [onpremSslCert, setOnpremSslCert] = useState('');
  const [onpremVpnConnectivity, setOnpremVpnConnectivity] = useState('');
  const [onpremFirewallPorts, setOnpremFirewallPorts] = useState('');
  const [onpremRequiredPermissions, setOnpremRequiredPermissions] = useState('');
  const [onpremClusterName, setOnpremClusterName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let credentials: Record<string, any> = {};

    if (provider.key === 'AWS') {
      credentials = {
        aws_account_id: awsAccountId,
        access_key_id: awsAccessKeyId,
        secret_access_key: awsSecretAccessKey,
        role_arn: awsRoleArn,
        session_token: awsSessionToken,
        region: awsRegion,
        required_iam_permissions: awsRequiredPermissions
      };
    } else if (provider.key === 'Azure') {
      credentials = {
        tenant_id: azureTenantId,
        subscription_id: azureSubscriptionId,
        client_id: azureClientId,
        client_secret: azureClientSecret,
        rbac_roles: azureRbacRoles
      };
    } else if (provider.key === 'GCP') {
      credentials = {
        project_id: gcpProjectId,
        service_account_email: gcpServiceAccountEmail,
        service_account_json: gcpServiceAccountJson,
        region: gcpRegion ? gcpRegion.trim() : undefined
      };
    } else {
      credentials = {
        server_hostname_ip: onpremServerHostnameIp,
        domain_name: onpremDomainName,
        username: onpremUsername,
        password: onpremPassword,
        domain_controller_details: onpremDomainController,
        auth_protocol: onpremAuthProtocol,
        ssh_key: onpremSshKey,
        ssl_tls_certificates: onpremSslCert,
        vpn_network_connectivity: onpremVpnConnectivity,
        firewall_ports_whitelisting: onpremFirewallPorts,
        required_server_permissions: onpremRequiredPermissions,
        cluster_name: onpremClusterName
      };
    }

    onSubmit(credentials);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
    >
      <div
        className="glass-panel modal-responsive-dialog"
        style={{
          width: 'min(740px, 95vw)',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#FFFFFF',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          border: '1px solid #E2E8F0',
          overflow: 'hidden'
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #E2E8F0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '12px',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}
            >
              <CloudLogo provider={provider.key} size={32} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.25rem', margin: 0, color: '#0F172A', fontWeight: 800 }}>
                Authenticate {provider.label}
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                Required authentication details to validate and unlock {provider.clusterType} clusters
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748B',
              padding: '6px',
              borderRadius: '8px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Security Notification Banner */}
        <div
          style={{
            padding: '10px 20px',
            background: '#EFF6FF',
            borderBottom: '1px solid #DBEAFE',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.78rem',
            color: '#1E40AF'
          }}
        >
          <ShieldCheck size={18} color="#2563EB" />
          <span>
            Credentials are cryptographically validated in-memory via AES-256 KMS. Once authenticated, <strong>only</strong> this cloud's Kubernetes clusters will be displayed.
          </span>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          style={{
            padding: '20px 24px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '14px',
            maxHeight: 'calc(92vh - 160px)'
          }}
        >
          {/* ================= AWS FORM FIELDS ================= */}
          {provider.key === 'AWS' && (
            <>
              <div className="grid-responsive-1-2" style={{ gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    AWS Account ID <span style={{ color: '#E11D48' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={awsAccountId}
                    onChange={(e) => setAwsAccountId(e.target.value)}
                    placeholder="12-digit AWS Account ID"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-strong)', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Region <span style={{ color: '#E11D48' }}>*</span>
                  </label>
                  <select
                    value={awsRegion}
                    onChange={(e) => setAwsRegion(e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-strong)', fontSize: '0.82rem', color: '#0F172A' }}
                  >
                    <option value="us-east-1">US East (N. Virginia) us-east-1</option>
                    <option value="us-east-2">US East (Ohio) us-east-2</option>
                    <option value="us-west-2">US West (Oregon) us-west-2</option>
                    <option value="eu-west-1">EU (Ireland) eu-west-1</option>
                    <option value="eu-central-1">EU (Frankfurt) eu-central-1</option>
                    <option value="ap-southeast-1">Asia Pacific (Singapore) ap-southeast-1</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  IAM Role ARN <span style={{ color: '#E11D48' }}>*</span>
                </label>
                <input
                  type="text"
                  value={awsRoleArn}
                  onChange={(e) => setAwsRoleArn(e.target.value)}
                  placeholder="arn:aws:iam::123456789012:role/kmm-eks-migration-role"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-strong)', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}
                  required
                />
              </div>

              <div className="grid-responsive-1-2" style={{ gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Access Key ID <span style={{ color: '#64748B', fontWeight: 400 }}>(if required)</span>
                  </label>
                  <input
                    type="text"
                    value={awsAccessKeyId}
                    onChange={(e) => setAwsAccessKeyId(e.target.value)}
                    placeholder="AKIAIOSFODNN7EXAMPLE"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-strong)', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Secret Access Key <span style={{ color: '#64748B', fontWeight: 400 }}>(if required)</span>
                  </label>
                  <input
                    type="password"
                    value={awsSecretAccessKey}
                    onChange={(e) => setAwsSecretAccessKey(e.target.value)}
                    placeholder="••••••••••••••••••••••••"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-strong)', fontSize: '0.82rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Session Token <span style={{ color: '#64748B', fontWeight: 400 }}>(for temporary credentials)</span>
                </label>
                <textarea
                  rows={2}
                  value={awsSessionToken}
                  onChange={(e) => setAwsSessionToken(e.target.value)}
                  placeholder="AWS STS Session Token"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-strong)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Required IAM Permissions <span style={{ color: '#E11D48' }}>*</span>
                </label>
                <textarea
                  rows={2}
                  value={awsRequiredPermissions}
                  onChange={(e) => setAwsRequiredPermissions(e.target.value)}
                  placeholder="eks:DescribeCluster, eks:ListClusters, iam:PassRole, s3:PutObject..."
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-strong)', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: '#0F172A' }}
                  required
                />
              </div>
            </>
          )}

          {/* ================= AZURE FORM FIELDS ================= */}
          {provider.key === 'Azure' && (
            <>
              <div className="grid-responsive-1-2" style={{ gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Tenant ID <span style={{ color: '#E11D48' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={azureTenantId}
                    onChange={(e) => setAzureTenantId(e.target.value)}
                    placeholder="72f988bf-86f1-41af-91ab-2d7cd011db47"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-strong)', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Subscription ID <span style={{ color: '#E11D48' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={azureSubscriptionId}
                    onChange={(e) => setAzureSubscriptionId(e.target.value)}
                    placeholder="a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-strong)', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}
                    required
                  />
                </div>
              </div>

              <div className="grid-responsive-1-2" style={{ gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Client ID (Application ID) <span style={{ color: '#E11D48' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={azureClientId}
                    onChange={(e) => setAzureClientId(e.target.value)}
                    placeholder="9f8e7d6c-5b4a-3f2e-1d0c-b8a7f6e5d4c3"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-strong)', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Client Secret or Certificate <span style={{ color: '#E11D48' }}>*</span>
                  </label>
                  <input
                    type="password"
                    value={azureClientSecret}
                    onChange={(e) => setAzureClientSecret(e.target.value)}
                    placeholder="••••••••••••••••••••••••"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-strong)', fontSize: '0.82rem' }}
                    required
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  RBAC Roles <span style={{ color: '#E11D48' }}>*</span>
                </label>
                <textarea
                  rows={2}
                  value={azureRbacRoles}
                  onChange={(e) => setAzureRbacRoles(e.target.value)}
                  placeholder="Azure Kubernetes Service Cluster Admin Role, Contributor..."
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-strong)', fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: '#0F172A' }}
                  required
                />
              </div>
            </>
          )}

          {/* ================= GCP FORM FIELDS ================= */}
          {provider.key === 'GCP' && (
            <>
              {/* Service Account JSON Key File Upload & Parser */}
              <div
                style={{
                  background: '#F8FAFC',
                  border: '1px dashed #CBD5E1',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Upload size={18} color="#059669" />
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0F172A' }}>
                      GCP Service Account JSON Key File <span style={{ color: '#E11D48' }}>*</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowJsonPasteMode(!showJsonPasteMode)}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#0284C7',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <FileCode size={13} /> {showJsonPasteMode ? 'Switch to File Upload' : 'Paste JSON Key Instead'}
                  </button>
                </div>

                {!showJsonPasteMode ? (
                  <div>
                    <label
                      htmlFor="gcp-key-file-upload"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                        borderRadius: '8px',
                        background: '#FFFFFF',
                        border: '1px solid #E2E8F0',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Upload size={22} color="#0284C7" style={{ marginBottom: '6px' }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#0F172A' }}>
                        {gcpJsonFileName ? `Loaded: ${gcpJsonFileName}` : 'Click or Drag & Drop Service Account .json Key'}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '2px' }}>
                        Supports downloaded Google Cloud Service Account JSON credentials
                      </span>
                      <input
                        id="gcp-key-file-upload"
                        type="file"
                        accept=".json,application/json"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleGcpJsonFileSelect(file);
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <div>
                    <textarea
                      rows={4}
                      value={gcpJsonRawText}
                      onChange={(e) => handleGcpJsonRawTextChange(e.target.value)}
                      placeholder='Paste complete GCP Service Account JSON key content here: { "type": "service_account", "project_id": "...", "private_key": "..." }'
                      style={{
                        width: '100%',
                        padding: '10px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-strong)',
                        fontSize: '0.74rem',
                        fontFamily: 'var(--font-mono)',
                        outline: 'none',
                        background: '#FFFFFF'
                      }}
                    />
                  </div>
                )}

                {gcpServiceAccountJson && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: '#ECFDF5',
                      border: '1px solid #A7F3D0',
                      fontSize: '0.76rem',
                      color: '#065F46'
                    }}
                  >
                    <CheckCircle2 size={16} color="#059669" />
                    <span>
                      Valid Service Account Key: <strong>{gcpServiceAccountJson.client_email}</strong> (Project: <strong>{gcpServiceAccountJson.project_id}</strong>)
                    </span>
                  </div>
                )}

                {gcpJsonError && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      background: '#FEF2F2',
                      border: '1px solid #FECACA',
                      fontSize: '0.76rem',
                      color: '#991B1B'
                    }}
                  >
                    <AlertTriangle size={16} color="#DC2626" />
                    <span>{gcpJsonError}</span>
                  </div>
                )}
              </div>

              {/* Project ID and Region */}
              <div className="grid-responsive-1-2" style={{ gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Google Cloud Project ID <span style={{ color: '#E11D48' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={gcpProjectId}
                    onChange={(e) => setGcpProjectId(e.target.value)}
                    placeholder="e.g. project-e746f24e-392a-429f-a4d"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-strong)', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}
                    required
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '2px', display: 'block' }}>
                    Auto-extracted from key or type project ID
                  </span>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    GCP Region (Enter Manually) <span style={{ color: '#E11D48' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={gcpRegion}
                    onChange={(e) => setGcpRegion(e.target.value)}
                    placeholder="e.g. us-central1 (or us-east1, asia-south1)"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-strong)', fontSize: '0.82rem', fontFamily: 'var(--font-mono)', color: '#0F172A', background: '#FFFFFF' }}
                    required
                  />
                  <span style={{ fontSize: '0.7rem', color: '#64748B', marginTop: '2px', display: 'block' }}>
                    Type the GCP region where your GKE cluster is located
                  </span>
                </div>
              </div>

              {/* Service Account Email */}
              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  Service Account Client Email <span style={{ color: '#E11D48' }}>*</span>
                </label>
                <input
                  type="email"
                  value={gcpServiceAccountEmail}
                  onChange={(e) => setGcpServiceAccountEmail(e.target.value)}
                  placeholder="e.g. huntdevops-cicd-sa@project-e746f24e-392a-429f-a4d.iam.gserviceaccount.com"
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-strong)', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}
                  required
                />
              </div>
            </>
          )}

          {/* ================= ON-PREMISES FORM FIELDS ================= */}
          {provider.key === 'On-Premises' && (
            <>
              <div className="grid-responsive-1-2" style={{ gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Server Hostname / IP Address <span style={{ color: '#E11D48' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={onpremServerHostnameIp}
                    onChange={(e) => setOnpremServerHostnameIp(e.target.value)}
                    placeholder="192.168.1.100 or k8s-master.internal.corp"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-strong)', fontSize: '0.82rem', fontFamily: 'var(--font-mono)' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Domain Name (Active Directory) <span style={{ color: '#E11D48' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={onpremDomainName}
                    onChange={(e) => setOnpremDomainName(e.target.value)}
                    placeholder="CORP.INTERNAL"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-strong)', fontSize: '0.82rem' }}
                    required
                  />
                </div>
              </div>

              <div className="grid-responsive-1-2" style={{ gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Username or Service Account <span style={{ color: '#E11D48' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={onpremUsername}
                    onChange={(e) => setOnpremUsername(e.target.value)}
                    placeholder="svc_kmm_operator"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-strong)', fontSize: '0.82rem' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Password <span style={{ color: '#E11D48' }}>*</span>
                  </label>
                  <input
                    type="password"
                    value={onpremPassword}
                    onChange={(e) => setOnpremPassword(e.target.value)}
                    placeholder="••••••••••••••••••••••••"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-strong)', fontSize: '0.82rem' }}
                    required
                  />
                </div>
              </div>

              <div className="grid-responsive-1-2" style={{ gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Domain Controller Details <span style={{ color: '#E11D48' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={onpremDomainController}
                    onChange={(e) => setOnpremDomainController(e.target.value)}
                    placeholder="dc01.corp.internal:636"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-strong)', fontSize: '0.82rem' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Authentication Protocol <span style={{ color: '#E11D48' }}>*</span>
                  </label>
                  <select
                    value={onpremAuthProtocol}
                    onChange={(e) => setOnpremAuthProtocol(e.target.value as any)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-strong)', fontSize: '0.82rem', color: '#0F172A' }}
                  >
                    <option value="LDAPS">LDAPS (Secure LDAP over SSL - Port 636)</option>
                    <option value="Kerberos">Kerberos (Ticket Granting Service / SPN)</option>
                    <option value="LDAP">LDAP (Port 389)</option>
                    <option value="NTLM">NTLMv2 Challenge-Response</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  SSH Key (Linux servers) <span style={{ color: '#64748B', fontWeight: 400 }}>(ED25519 or RSA)</span>
                </label>
                <textarea
                  rows={2}
                  value={onpremSshKey}
                  onChange={(e) => setOnpremSshKey(e.target.value)}
                  placeholder="ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAI..."
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-strong)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                  SSL/TLS Certificates (if applicable) <span style={{ color: '#64748B', fontWeight: 400 }}>(CA Certificate Chain)</span>
                </label>
                <textarea
                  rows={2}
                  value={onpremSslCert}
                  onChange={(e) => setOnpremSslCert(e.target.value)}
                  placeholder="-----BEGIN CERTIFICATE-----\n..."
                  style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-strong)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}
                />
              </div>

              <div className="grid-responsive-1-2" style={{ gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    VPN / Network Connectivity <span style={{ color: '#E11D48' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={onpremVpnConnectivity}
                    onChange={(e) => setOnpremVpnConnectivity(e.target.value)}
                    placeholder="WireGuard Tunnel / IPSec (Connected)"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-strong)', fontSize: '0.82rem' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Firewall Ports & Whitelisting <span style={{ color: '#E11D48' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={onpremFirewallPorts}
                    onChange={(e) => setOnpremFirewallPorts(e.target.value)}
                    placeholder="Port 6443, 443, 22 Whitelisted"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-strong)', fontSize: '0.82rem' }}
                    required
                  />
                </div>
              </div>

              <div className="grid-responsive-1-2" style={{ gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Required Server Access Permissions <span style={{ color: '#E11D48' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={onpremRequiredPermissions}
                    onChange={(e) => setOnpremRequiredPermissions(e.target.value)}
                    placeholder="cluster-admin, root sudoers"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-strong)', fontSize: '0.82rem' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, color: '#334155', marginBottom: '4px' }}>
                    Target On-Prem Cluster Name <span style={{ color: '#E11D48' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={onpremClusterName}
                    onChange={(e) => setOnpremClusterName(e.target.value)}
                    placeholder="onprem-core-datacenter-01"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: '8px', border: '1px solid var(--border-strong)', fontSize: '0.82rem' }}
                    required
                  />
                </div>
              </div>
            </>
          )}

          {/* Form Actions Footer */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px',
              marginTop: '12px',
              paddingTop: '16px',
              borderTop: '1px solid #E2E8F0'
            }}
          >
            <button type="button" className="btn-secondary" onClick={onClose} disabled={isAuthenticating}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isAuthenticating}
              style={{
                background: `linear-gradient(135deg, ${provider.color} 0%, #0F172A 100%)`,
                padding: '10px 22px',
                fontWeight: 700,
                boxShadow: '0 4px 14px rgba(0,0,0,0.15)'
              }}
            >
              {isAuthenticating ? (
                <>
                  <RefreshCw size={16} className="spin" /> Validating Control Plane Credentials...
                </>
              ) : (
                <>
                  <Key size={16} /> Authenticate & Discover {provider.clusterType}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
