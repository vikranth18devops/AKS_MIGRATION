import React from 'react';

interface CloudLogoProps {
  provider: 'AWS' | 'Azure' | 'GCP' | 'Google Cloud' | 'On-Premises' | string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export const CloudLogo: React.FC<CloudLogoProps> = ({
  provider,
  size = 24,
  className = '',
  style = {}
}) => {
  const norm = (provider || '').toUpperCase();

  if (norm.includes('AWS') || norm.includes('EKS')) {
    return (
      <img
        src="/logos/aws-eks.svg"
        alt="Amazon EKS Logo"
        width={size}
        height={size}
        className={className}
        style={{
          objectFit: 'contain',
          display: 'inline-block',
          verticalAlign: 'middle',
          borderRadius: '4px',
          ...style
        }}
      />
    );
  }

  if (norm.includes('AZURE') || norm.includes('AKS')) {
    return (
      <img
        src="/logos/azure-aks.svg"
        alt="Azure Kubernetes Service (AKS) Logo"
        width={size}
        height={size}
        className={className}
        style={{
          objectFit: 'contain',
          display: 'inline-block',
          verticalAlign: 'middle',
          borderRadius: '4px',
          ...style
        }}
      />
    );
  }

  if (norm.includes('GCP') || norm.includes('GOOGLE') || norm.includes('GKE')) {
    return (
      <img
        src="/logos/gke.png"
        alt="Google Kubernetes Engine (GKE) Logo"
        width={size}
        height={size}
        className={className}
        style={{
          objectFit: 'contain',
          display: 'inline-block',
          verticalAlign: 'middle',
          borderRadius: '4px',
          ...style
        }}
      />
    );
  }

  // On-Premises (Private Datacenter)
  return (
    <img
      src="/logos/on-premise.png"
      alt="On-Premises Kubernetes Logo"
      width={size}
      height={size}
      className={className}
      style={{
        objectFit: 'contain',
        display: 'inline-block',
        verticalAlign: 'middle',
        borderRadius: '4px',
        ...style
      }}
    />
  );
};
