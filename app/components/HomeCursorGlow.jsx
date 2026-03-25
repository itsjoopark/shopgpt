import {useEffect, useId, useRef} from 'react';

/** Visible glow radius — small, tight around the cursor */
const GLOW_RADIUS = 92;

/**
 * Subtle dithered / grainy radial glow that follows the pointer inside `containerRef` only.
 */
export function HomeCursorGlow({containerRef}) {
  const glowRef = useRef(null);
  const rawId = useId();
  const filterId = `home-glow-${rawId.replace(/:/g, '')}`;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const container = containerRef?.current;
    const glow = glowRef.current;
    if (!container || !glow) return;

    function setGlowAt(clientX, clientY) {
      const rect = container.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      glow.style.background = `radial-gradient(${GLOW_RADIUS}px circle at ${x}px ${y}px, rgba(236, 242, 252, 0.14) 0%, rgba(220, 232, 246, 0.05) 42%, transparent 68%)`;
    }

    function handleMove(e) {
      setGlowAt(e.clientX, e.clientY);
    }

    function handleEnter(e) {
      glow.style.opacity = '1';
      setGlowAt(e.clientX, e.clientY);
    }

    function handleLeave() {
      glow.style.opacity = '0';
    }

    container.addEventListener('mousemove', handleMove, {passive: true});
    container.addEventListener('mouseenter', handleEnter);
    container.addEventListener('mouseleave', handleLeave);

    return () => {
      container.removeEventListener('mousemove', handleMove);
      container.removeEventListener('mouseenter', handleEnter);
      container.removeEventListener('mouseleave', handleLeave);
    };
  }, [containerRef]);

  return (
    <>
      <svg
        className="home-cursor-glow-svg"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <filter
            id={filterId}
            x="-40%"
            y="-40%"
            width="180%"
            height="180%"
            colorInterpolationFilters="sRGB"
          >
            <feTurbulence
              type="fractalNoise"
              baseFrequency="1.85"
              numOctaves="2"
              stitchTiles="stitch"
              result="noise"
            />
            <feColorMatrix
              in="noise"
              type="matrix"
              values="0.22 0.2 0.18 0 0.9
                      0.2 0.22 0.2 0 0.92
                      0.16 0.2 0.32 0 0.94
                      0 0 0 0.11 0"
              result="grain"
            />
            <feBlend in="SourceGraphic" in2="grain" mode="soft-light" />
          </filter>
        </defs>
      </svg>
      <div
        ref={glowRef}
        className="home-cursor-glow"
        style={{filter: `url(#${filterId})`}}
        aria-hidden="true"
      />
    </>
  );
}
