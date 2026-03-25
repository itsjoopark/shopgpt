import {useEffect, useRef} from 'react';

function shuffleArray(arr) {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const GRAVITY = 900;
const THROTTLE_MS = 100;
const MIN_DISTANCE = 50;
const MAX_ITEMS = 18;
const REST_DURATION = 1000;
const FADE_DURATION = 400;
const ITEM_SIZE = 90;

export function CursorTrail({images, containerRef}) {
  const overlayRef = useRef(null);
  const itemsRef = useRef([]);
  const shuffledRef = useRef([]);
  const indexRef = useRef(0);
  const lastSpawnTimeRef = useRef(0);
  const lastSpawnPosRef = useRef({x: 0, y: 0});
  const rafRef = useRef(null);
  const lastFrameRef = useRef(0);

  useEffect(() => {
    if (!images?.length) return;
    shuffledRef.current = shuffleArray(images);
    indexRef.current = 0;
  }, [images]);

  useEffect(() => {
    if (!images?.length || typeof window === 'undefined') return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const overlay = overlayRef.current;
    const container = containerRef?.current;
    if (!overlay || !container) return;

    function getFloorY() {
      const hero = container.querySelector('.home-hero-centered');
      if (hero) return hero.offsetTop + hero.offsetHeight - ITEM_SIZE;
      return container.offsetHeight - ITEM_SIZE;
    }

    function spawnItem(clientX, clientY) {
      const rect = container.getBoundingClientRect();
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      const list = shuffledRef.current;
      if (!list.length) return;

      const img = list[indexRef.current % list.length];
      indexRef.current++;

      const el = document.createElement('img');
      el.className = 'cursor-trail-item';
      el.src = img.url;
      el.alt = '';
      el.draggable = false;
      overlay.appendChild(el);

      const item = {
        el,
        x: x - ITEM_SIZE / 2,
        y: y - ITEM_SIZE / 2,
        vy: 0,
        phase: 'falling',
        restStart: 0,
        fadeStart: 0,
        opacity: 1,
      };

      el.style.transform = `translate(${item.x}px, ${item.y}px)`;
      el.style.opacity = '1';

      itemsRef.current.push(item);

      while (itemsRef.current.length > MAX_ITEMS) {
        const old = itemsRef.current.shift();
        old.el.remove();
      }
    }

    function animate(timestamp) {
      if (!lastFrameRef.current) lastFrameRef.current = timestamp;
      const dt = Math.min((timestamp - lastFrameRef.current) / 1000, 0.05);
      lastFrameRef.current = timestamp;

      const floorY = getFloorY();
      const items = itemsRef.current;

      for (let i = items.length - 1; i >= 0; i--) {
        const item = items[i];

        if (item.phase === 'falling') {
          item.vy += GRAVITY * dt;
          item.y += item.vy * dt;
          if (item.y >= floorY) {
            item.y = floorY;
            item.vy = 0;
            item.phase = 'resting';
            item.restStart = timestamp;
          }
          item.el.style.transform = `translate(${item.x}px, ${item.y}px)`;
        } else if (item.phase === 'resting') {
          if (timestamp - item.restStart >= REST_DURATION) {
            item.phase = 'fading';
            item.fadeStart = timestamp;
          }
        } else if (item.phase === 'fading') {
          const elapsed = timestamp - item.fadeStart;
          item.opacity = Math.max(0, 1 - elapsed / FADE_DURATION);
          item.el.style.opacity = String(item.opacity);
          if (item.opacity <= 0) {
            item.el.remove();
            items.splice(i, 1);
          }
        }
      }

      rafRef.current = requestAnimationFrame(animate);
    }

    function handleMouseMove(e) {
      const now = Date.now();
      if (now - lastSpawnTimeRef.current < THROTTLE_MS) return;

      const dx = e.clientX - lastSpawnPosRef.current.x;
      const dy = e.clientY - lastSpawnPosRef.current.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < MIN_DISTANCE && lastSpawnTimeRef.current > 0) return;

      lastSpawnTimeRef.current = now;
      lastSpawnPosRef.current = {x: e.clientX, y: e.clientY};

      spawnItem(e.clientX, e.clientY);
    }

    container.addEventListener('mousemove', handleMouseMove, {passive: true});
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      itemsRef.current.forEach((item) => item.el.remove());
      itemsRef.current = [];
      lastFrameRef.current = 0;
    };
  }, [images, containerRef]);

  if (!images?.length) return null;

  return (
    <div ref={overlayRef} className="cursor-trail-overlay" aria-hidden="true" />
  );
}
