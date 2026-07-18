/**
 * A subtle, abstract network/node pattern used as a decorative background
 * behind the landing page hero section. Represents "blockchain / connected
 * network" abstractly rather than literally (no cliché glowing cube/chain
 * imagery), kept at very low opacity so it never competes with the
 * headline text. Pure SVG, no image asset, so it stays crisp at any
 * screen size and adds no load time.
 */
export function HeroNetworkPattern() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full text-primary"
      viewBox="0 0 1200 600"
      preserveAspectRatio="xMidYMid slice"
      fill="none"
    >
      <g opacity="0.22" stroke="currentColor" strokeWidth="1.25">
        <line x1="80" y1="90" x2="260" y2="180" />
        <line x1="260" y1="180" x2="180" y2="340" />
        <line x1="260" y1="180" x2="460" y2="120" />
        <line x1="460" y1="120" x2="620" y2="260" />
        <line x1="620" y1="260" x2="820" y2="160" />
        <line x1="820" y1="160" x2="1020" y2="220" />
        <line x1="1020" y1="220" x2="1140" y2="100" />
        <line x1="620" y1="260" x2="700" y2="420" />
        <line x1="700" y1="420" x2="880" y2="480" />
        <line x1="880" y1="480" x2="1080" y2="420" />
        <line x1="180" y1="340" x2="360" y2="440" />
        <line x1="360" y1="440" x2="560" y2="460" />
        <line x1="560" y1="460" x2="700" y2="420" />
        <line x1="80" y1="90" x2="40" y2="260" />
        <line x1="40" y1="260" x2="180" y2="340" />
        <line x1="1020" y1="220" x2="1160" y2="340" />
      </g>
      <g fill="currentColor" opacity="0.32">
        <circle cx="80" cy="90" r="5" />
        <circle cx="260" cy="180" r="6" />
        <circle cx="180" cy="340" r="5" />
        <circle cx="460" cy="120" r="5" />
        <circle cx="620" cy="260" r="7" />
        <circle cx="820" cy="160" r="5" />
        <circle cx="1020" cy="220" r="6" />
        <circle cx="1140" cy="100" r="5" />
        <circle cx="700" cy="420" r="6" />
        <circle cx="880" cy="480" r="5" />
        <circle cx="1080" cy="420" r="5" />
        <circle cx="360" cy="440" r="5" />
        <circle cx="560" cy="460" r="5" />
        <circle cx="40" cy="260" r="5" />
        <circle cx="1160" cy="340" r="5" />
      </g>
    </svg>
  );
}
