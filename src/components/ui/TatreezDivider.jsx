export function TatreezDivider({ className = "" }) {
  const stars = [16, 48, 80, 112, 144, 176, 208, 240, 272, 304];
  return (
    <div className={`pointer-events-none flex justify-center py-2 ${className}`} aria-hidden="true">
      <svg viewBox="0 0 320 16" className="h-4 w-full max-w-md opacity-[0.1]" fill="currentColor">
        <path d="M4 8h8M308 8h8" stroke="currentColor" strokeWidth="1" />
        {stars.map((x) => (
          <g key={x} transform={`translate(${x} 8)`}>
            <rect x="-2.2" y="-2.2" width="4.4" height="4.4" />
            <rect x="-2.2" y="-2.2" width="4.4" height="4.4" transform="rotate(45)" />
          </g>
        ))}
      </svg>
    </div>
  );
}
