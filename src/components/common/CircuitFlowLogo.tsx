import React from 'react';
import './CircuitFlowLogo.css';

export interface CircuitFlowLogoProps {
  variant?: 'full' | 'emblem' | 'horizontal' | 'wordmark';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showBadge?: boolean;
  badgeText?: string;
  subtitle?: string;
  onClick?: () => void;
}

export const CircuitFlowLogo: React.FC<CircuitFlowLogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  className = '',
  showBadge = false,
  badgeText = 'SIM',
  subtitle,
  onClick,
}) => {
  const containerClasses = [
    'circuitflow-logo',
    `cf-logo-${variant}`,
    `cf-logo-size-${size}`,
    onClick ? 'cf-logo-clickable' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // Full artwork image variant (e.g. Hero, Splash, AuthModal)
  if (variant === 'full') {
    return (
      <div className={containerClasses} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
        <div className="cf-logo-full-wrapper">
          <img
            src="/assets/branding/circuitflow-logo-master.jpg"
            alt="CircuitFlow - Digital Logic Simulator"
            className="cf-logo-master-img"
            loading="eager"
          />
        </div>
        {subtitle && <span className="cf-logo-full-sub">{subtitle}</span>}
      </div>
    );
  }

  // Emblem only variant (e.g. compact toolbars or favicons)
  if (variant === 'emblem') {
    return (
      <div className={containerClasses} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined} title="CircuitFlow">
        <div className="cf-emblem-badge" aria-hidden="true">
          <img
            src="/favicon.svg"
            alt="CircuitFlow Emblem"
            className="cf-emblem-svg"
          />
        </div>
      </div>
    );
  }

  // Wordmark only variant
  if (variant === 'wordmark') {
    return (
      <div className={containerClasses} onClick={onClick} role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
        <span className="cf-wordmark">
          <span className="cf-word-circuit">Circuit</span>
          <span className="cf-word-flow">Flow</span>
        </span>
        {showBadge && <span className="cf-logo-badge">{badgeText}</span>}
      </div>
    );
  }

  // Horizontal variant: Emblem + Wordmark + optional Badge (TopBar, Navbar)
  return (
    <div
      className={containerClasses}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      title="CircuitFlow — Digital Electronics Workbench"
    >
      <div className="cf-emblem-badge" aria-hidden="true">
        <img
          src="/favicon.svg"
          alt="CircuitFlow"
          className="cf-emblem-svg"
        />
      </div>
      <div className="cf-text-col">
        <span className="cf-wordmark">
          <span className="cf-word-circuit">Circuit</span>
          <span className="cf-word-flow">Flow</span>
          {showBadge && <span className="cf-logo-badge">{badgeText}</span>}
        </span>
        {subtitle && <span className="cf-logo-subtext">{subtitle}</span>}
      </div>
    </div>
  );
};

export default CircuitFlowLogo;
