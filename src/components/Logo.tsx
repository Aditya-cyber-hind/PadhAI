interface LogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
  variant?: 'default' | 'onDark';
}

export default function Logo({
  size = 32,
  showWordmark = true,
  className = '',
  variant = 'default',
}: LogoProps) {
  const iconSize = size;
  const fontSize = Math.round(size * 0.72);
  const dotSize = size * 0.08;

  const wordmarkColor =
    variant === 'onDark' ? 'text-white' : 'text-stone-900';

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      {/* Icon: rounded square with amber gradient + Fraunces P */}
      <div
        className="relative flex items-center justify-center flex-shrink-0"
        style={{
          width: iconSize,
          height: iconSize,
          borderRadius: iconSize * 0.28,
          background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 50%, #d97706 100%)',
          boxShadow: `0 ${iconSize * 0.04}px ${iconSize * 0.12}px rgba(217, 119, 6, 0.25)`,
        }}
        aria-hidden="true"
      >
        <span
          className="font-display font-bold text-white leading-none select-none"
          style={{
            fontSize: iconSize * 0.65,
            lineHeight: 1,
            marginTop: -iconSize * 0.02,
          }}
        >
          P
        </span>
        <span
          className="absolute rounded-full bg-white/90"
          style={{
            width: dotSize,
            height: dotSize,
            top: iconSize * 0.22,
            right: iconSize * 0.2,
          }}
        />
      </div>

      {showWordmark && (
        <span
          className={`font-display ${wordmarkColor} tracking-tight leading-none`}
          style={{ fontSize: `${fontSize}px` }}
        >
          Padh
          <span className="italic font-bold">AI</span>
        </span>
      )}
    </div>
  );
}