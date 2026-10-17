import React from "react";

/**
 * ModernTatreezAccent — Lightweight, vector-based authentic Palestinian Fellahi Tatreez motifs.
 * Inspired by:
 * - نجمة كنعان (Star of Canaan / 8-pointed geometric star)
 * - ريش الزيتون (Olive branches / geometric chevron feathering)
 * - عرق الورد (Rosette / floral vines)
 *
 * Configured with sovereign palette:
 * - Palestine Emerald (#047857)
 * - Vermilion Red (#dc2626)
 * - Obsidian Black (#0f172a / #000000)
 *
 * Soft, dignified ambient opacity (default 10% in light mode, 5% in dark mode)
 * Zero CLS, GPU-accelerated SVG rendering.
 */

export function ModernTatreezAccent({
  variant = "ribbon",
  className = "",
  opacity = "opacity-10 dark:opacity-5",
  title = "نقش تطريز فلاحي فلسطيني عصري",
  ...props
}) {
  if (variant === "star") {
    return (
      <svg
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className={`pointer-events-none select-none transition-opacity ${opacity} ${className}`}
        {...props}
      >
        <title>{title}</title>
        {/* نجمة كنعان الهندسية */}
        <g strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          {/* المركز - زمرد فلسطيني */}
          <rect x="26" y="26" width="12" height="12" fill="#047857" transform="rotate(45 32 32)" />
          {/* الأذرع العمودية والأفقية - أحمر قاني */}
          <polygon points="32,8 36,22 28,22" fill="#dc2626" />
          <polygon points="32,56 36,42 28,42" fill="#dc2626" />
          <polygon points="8,32 22,28 22,36" fill="#dc2626" />
          <polygon points="56,32 42,28 42,36" fill="#dc2626" />
          {/* الأذرع المائلة - أسود سبجي */}
          <polygon points="15,15 26,20 20,26" fill="#0f172a" />
          <polygon points="49,15 44,26 38,20" fill="#0f172a" />
          <polygon points="15,49 20,38 26,44" fill="#0f172a" />
          <polygon points="49,49 38,44 44,38" fill="#0f172a" />
          {/* محددات التطريز التكميلية */}
          <circle cx="32" cy="32" r="3" fill="#ffffff" />
        </g>
      </svg>
    );
  }

  if (variant === "olive") {
    return (
      <svg
        viewBox="0 0 80 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className={`pointer-events-none select-none transition-opacity ${opacity} ${className}`}
        {...props}
      >
        <title>{title}</title>
        {/* ريش الزيتون التراثي */}
        <g strokeWidth="1.2" strokeLinecap="round">
          <line x1="4" y1="20" x2="76" y2="20" stroke="#047857" strokeDasharray="3 3" />
          {/* أوراق الزيتون الهندسية */}
          <polygon points="16,20 24,10 32,20" fill="#047857" />
          <polygon points="16,20 24,30 32,20" fill="#047857" />
          <polygon points="36,20 44,8 52,20" fill="#dc2626" />
          <polygon points="36,20 44,32 52,20" fill="#dc2626" />
          <polygon points="56,20 64,10 72,20" fill="#0f172a" />
          <polygon points="56,20 64,30 72,20" fill="#0f172a" />
        </g>
      </svg>
    );
  }

  if (variant === "corner") {
    return (
      <svg
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className={`pointer-events-none select-none transition-opacity ${opacity} ${className}`}
        {...props}
      >
        <title>{title}</title>
        {/* زاوية تطريز فلاحي */}
        <g fill="#047857">
          <rect x="0" y="0" width="8" height="8" />
          <rect x="12" y="0" width="8" height="8" fill="#dc2626" />
          <rect x="24" y="0" width="8" height="8" fill="#0f172a" />
          <rect x="0" y="12" width="8" height="8" fill="#dc2626" />
          <rect x="12" y="12" width="8" height="8" fill="#047857" />
          <rect x="0" y="24" width="8" height="8" fill="#0f172a" />
        </g>
      </svg>
    );
  }

  // Default: variant === "ribbon" (Horizontal dividing ambient ribbon)
  return (
    <div
      aria-hidden="true"
      className={`relative w-full overflow-hidden select-none pointer-events-none ${opacity} ${className}`}
      {...props}
    >
      <svg
        className="w-full h-4 sm:h-5 block"
        viewBox="0 0 1200 24"
        fill="none"
        preserveAspectRatio="repeat-x"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title>{title}</title>
        <defs>
          <pattern id="tatreez-fellahi-unit" width="80" height="24" patternUnits="userSpaceOnUse">
            {/* خيط الأساس */}
            <line x1="0" y1="12" x2="80" y2="12" stroke="#047857" strokeWidth="1" strokeDasharray="2 2" />

            {/* معينات نجمة كنعان */}
            <polygon points="12,12 20,4 28,12 20,20" fill="#047857" />
            <polygon points="17,12 20,9 23,12 20,15" fill="#ffffff" />

            {/* تشكيلة عرق الورد وريش الزيتون */}
            <polygon points="34,12 38,7 42,12 38,17" fill="#dc2626" />
            <polygon points="46,12 50,7 54,12 50,17" fill="#0f172a" />

            <polygon points="60,12 68,4 76,12 68,20" fill="#047857" />
            <polygon points="65,12 68,9 71,12 68,15" fill="#ffffff" />

            {/* نقاط التقاطع الفلاحي */}
            <circle cx="4" cy="12" r="1.5" fill="#047857" />
            <circle cx="31" cy="12" r="1" fill="#dc2626" />
            <circle cx="57" cy="12" r="1" fill="#0f172a" />
          </pattern>
        </defs>
        <rect width="100%" height="24" fill="url(#tatreez-fellahi-unit)" />
      </svg>
    </div>
  );
}
