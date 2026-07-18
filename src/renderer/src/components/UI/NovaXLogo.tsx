// Custom NOVA-X neural eye logo - pure SVG, no external assets
export default function NovaXLogo({ size = 56 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0"
    >
      <defs>
        <radialGradient id="nova-core-grad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#34d399" stopOpacity="1" />
          <stop offset="60%" stopColor="#10b981" stopOpacity="0.8" />
          <stop offset="100%" stopColor="#052e1c" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="nova-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00f3ff" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
        <filter id="nova-glow">
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* Outer rotating ring */}
      <circle
        cx="32"
        cy="32"
        r="28"
        stroke="url(#nova-ring-grad)"
        strokeWidth="1.5"
        strokeDasharray="3 5"
        fill="none"
        opacity="0.4"
      />

      {/* Inner ring */}
      <circle
        cx="32"
        cy="32"
        r="22"
        stroke="#10b981"
        strokeWidth="1"
        fill="none"
        opacity="0.3"
      />

      {/* Core glow */}
      <circle cx="32" cy="32" r="18" fill="url(#nova-core-grad)" />

      {/* Neural eye - hexagonal iris */}
      <g filter="url(#nova-glow)">
        <polygon
          points="32,18 44,28 44,36 32,46 20,36 20,28"
          stroke="#34d399"
          strokeWidth="1.5"
          fill="none"
          opacity="0.7"
        />
        <polygon
          points="32,22 40,29 40,35 32,42 24,35 24,29"
          fill="#10b981"
          opacity="0.3"
        />
      </g>

      {/* Central pupil */}
      <circle cx="32" cy="32" r="4" fill="#34d399" filter="url(#nova-glow)" />
      <circle cx="32" cy="32" r="2" fill="#ffffff" opacity="0.9" />

      {/* Orbiting nodes */}
      <circle cx="32" cy="4" r="1.5" fill="#00f3ff" filter="url(#nova-glow)" />
      <circle cx="60" cy="32" r="1.5" fill="#34d399" filter="url(#nova-glow)" />
      <circle cx="32" cy="60" r="1.5" fill="#00f3ff" filter="url(#nova-glow)" />
      <circle cx="4" cy="32" r="1.5" fill="#34d399" filter="url(#nova-glow)" />
    </svg>
  )
}
