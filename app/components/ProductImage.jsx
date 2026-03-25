import {Image} from '@shopify/hydrogen';
import {useState, useRef, useCallback, useEffect} from 'react';

const MIN_SCALE = 1;
const MAX_SCALE = 3;
const ZOOM_STEP = 0.15;

/**
 * @param {{
 *   image: ProductVariantFragment['image'];
 * }}
 */
export function ProductImage({image}) {
  const [zoom, setZoom] = useState({scale: 1, x: 0, y: 0});
  const dragRef = useRef({active: false, startX: 0, startY: 0, originX: 0, originY: 0});
  const containerRef = useRef(null);
  const isDragging = zoom.scale > MIN_SCALE && dragRef.current.active;

  useEffect(() => {
    setZoom({scale: 1, x: 0, y: 0});
  }, [image?.id]);

  const clampTranslate = useCallback((x, y, scale) => {
    if (scale <= MIN_SCALE) return {x: 0, y: 0};
    const bound = ((scale - 1) / scale) * 0.5;
    return {
      x: Math.max(-bound, Math.min(bound, x)),
      y: Math.max(-bound, Math.min(bound, y)),
    };
  }, []);

  const handleWheel = useCallback(
    (e) => {
      e.preventDefault();
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      setZoom((prev) => {
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale + delta));

        if (nextScale === MIN_SCALE) return {scale: 1, x: 0, y: 0};

        const pointerX = (e.clientX - rect.left) / rect.width;
        const pointerY = (e.clientY - rect.top) / rect.height;
        const ratio = 1 - nextScale / prev.scale;
        const nextX = prev.x + (pointerX - 0.5 - prev.x) * ratio;
        const nextY = prev.y + (pointerY - 0.5 - prev.y) * ratio;
        const clamped = clampTranslate(nextX, nextY, nextScale);

        return {scale: nextScale, ...clamped};
      });
    },
    [clampTranslate],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, {passive: false});
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleMouseDown = useCallback(
    (e) => {
      if (zoom.scale <= MIN_SCALE) return;
      e.preventDefault();
      dragRef.current = {active: true, startX: e.clientX, startY: e.clientY, originX: zoom.x, originY: zoom.y};
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [zoom],
  );

  const handleMouseMove = useCallback(
    (e) => {
      const d = dragRef.current;
      if (!d.active) return;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const dx = (e.clientX - d.startX) / rect.width;
      const dy = (e.clientY - d.startY) / rect.height;

      setZoom((prev) => {
        const clamped = clampTranslate(d.originX + dx, d.originY + dy, prev.scale);
        return {...prev, ...clamped};
      });
    },
    [clampTranslate],
  );

  const handleMouseUp = useCallback(() => {
    dragRef.current.active = false;
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
  }, [handleMouseMove]);

  useEffect(() => {
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  const handleDoubleClick = useCallback(() => {
    setZoom({scale: 1, x: 0, y: 0});
  }, []);

  const cursorClass =
    zoom.scale > MIN_SCALE
      ? dragRef.current.active
        ? 'is-grabbing'
        : 'is-zoomed'
      : '';

  if (!image) {
    return <div className="product-image" />;
  }

  return (
    <div
      ref={containerRef}
      className={`product-image ${cursorClass}`}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      <div
        className="product-image-zoom"
        style={{
          transform: `scale(${zoom.scale}) translate(${zoom.x * 100}%, ${zoom.y * 100}%)`,
          transition: dragRef.current.active ? 'none' : undefined,
        }}
      >
        <Image
          alt={image.altText || 'Product Image'}
          aspectRatio="1/1"
          data={image}
          key={image.id}
          sizes="(min-width: 45em) 50vw, 100vw"
          draggable={false}
        />
      </div>
      {zoom.scale <= MIN_SCALE && (
        <div className="product-image-hint" aria-hidden="true">
          Scroll to zoom
        </div>
      )}
    </div>
  );
}

/** @typedef {import('storefrontapi.generated').ProductVariantFragment} ProductVariantFragment */
