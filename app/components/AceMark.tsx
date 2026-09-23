/**
 * The ACE wordmark, docked in the top-left corner. On the first page load
 * of a browser session it plays an intro first: the letters draw themselves
 * in large at the centre of the screen, then the mark shrinks and glides
 * into the corner while the page fades in. Whether to play is decided by
 * the inline script in layout.tsx (sets html[data-ace-intro]) before first
 * paint, so there's no flash either way. All motion is CSS (globals.css).
 */
export default function AceMark() {
  return (
    <>
      <div className="ace-veil" aria-hidden="true" />
      <div className="ace-mark" role="img" aria-label="Team ACE">
        <svg viewBox="0 0 304 124" aria-hidden="true">
          <g
            fill="none"
            stroke="currentColor"
            strokeWidth="15"
            strokeLinecap="butt"
            strokeLinejoin="miter"
          >
            {/* Λ */}
            <path pathLength={1} d="M10 110 L52 36 Q62 20 72 36 L114 110" />
            {/* C */}
            <path pathLength={1} d="M208 22 H148 L130 40 V92 L148 110 H208" />
            {/* E */}
            <path pathLength={1} d="M298 22 H226 V110 H298" />
            <path pathLength={1} d="M226 66 H290" />
          </g>
        </svg>
      </div>
    </>
  );
}
