import './Logo.css';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

// TODO: When auth is implemented, wrap Logo in Link to /dashboard/tickets if logged in
export function Logo({ size = 'md', showText = true }: LogoProps) {
  const sizeMap = {
    sm: 20,
    md: 32,
    lg: 48,
  };

  const iconSize = sizeMap[size];

  return (
    <div className={`logo logo--${size}`}>
      {/* Lumina Gradient Logo - Gold to Purple to Blue */}
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 128 128"
        fill="none"
        className="logo-icon"
      >
        <defs>
          <linearGradient
            id="lumina-grad"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#FFF700" />
            <stop offset="30%" stopColor="#FF7E5F" />
            <stop offset="70%" stopColor="#C084FC" />
            <stop offset="100%" stopColor="#3B82F6" />
          </linearGradient>
          <filter
            id="lumina-glow"
            x="-100%"
            y="-100%"
            width="300%"
            height="300%"
          >
            <feGaussianBlur stdDeviation="12" result="blur1" />
            <feGaussianBlur stdDeviation="4" result="blur2" />
            <feFlood floodColor="#FFF700" floodOpacity="0.6" result="color" />
            <feComposite in="color" in2="blur1" operator="in" result="glow1" />
            <feMerge>
              <feMergeNode in="glow1" />
              <feMergeNode in="blur2" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d="M64 0Q64 64 128 64Q64 64 64 128Q64 64 0 64Q64 64 64 0Z"
          fill="url(#lumina-grad)"
          filter="url(#lumina-glow)"
        />
      </svg>

      {showText && <span className="logo-text">Lumina</span>}
    </div>
  );
}

export default Logo;
