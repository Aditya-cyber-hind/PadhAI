interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}

export default function Logo({
  size = 32,
  showWordmark = true,
  className = '',
}: LogoProps) {
  // Icon scales with size, wordmark text scales proportionally
  const iconSize = size;
  const fontSize = Math.round(size * 0.62);

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id="logo-grad-inline"
            x1="0"
            y1="0"
            x2="48"
            y2="48"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0" stopColor="#3b82f6" />
            <stop offset="1" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <g transform="translate(4 4)">
          <rect
            x="6"
            y="6"
            width="28"
            height="28"
            rx="7"
            transform="rotate(45 20 20)"
            fill="url(#logo-grad-inline)"
          />
          <path
            d="M12 24 Q20 16 28 24"
            stroke="#ffffff"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M12 20 Q20 12 28 20"
            stroke="#ffffff"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
            opacity="0.65"
          />
          <circle cx="20" cy="18" r="1.8" fill="#ffffff" />
        </g>
      </svg>

      {showWordmark && (
        <span
          className="font-semibold text-stone-900 tracking-tight leading-none"
          style={{ fontSize: `${fontSize}px` }}
        >
          Padh<span className="font-bold">AI</span>
        </span>
      )}
    </div>
  );
}