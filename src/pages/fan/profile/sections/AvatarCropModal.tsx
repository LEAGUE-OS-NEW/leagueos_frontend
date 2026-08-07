import { useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { FiX } from 'react-icons/fi';
import './AvatarCropModal.css';

const FRAME_SIZE = 240;
const OUTPUT_SIZE = 320;
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

type Offset = { x: number; y: number };

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clampOffset(offset: Offset, dispW: number, dispH: number): Offset {
  const maxX = Math.max(0, (dispW - FRAME_SIZE) / 2);
  const maxY = Math.max(0, (dispH - FRAME_SIZE) / 2);
  return { x: clamp(offset.x, -maxX, maxX), y: clamp(offset.y, -maxY, maxY) };
}

function AvatarCropModal({
  imageSrc,
  onCancel,
  onConfirm,
}: {
  imageSrc: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void;
}) {
  const imageRef = useRef<HTMLImageElement>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [zoom, setZoom] = useState(MIN_ZOOM);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });
  const [isSaving, setIsSaving] = useState(false);
  const dragState = useRef<{ startX: number; startY: number; startOffset: Offset } | null>(null);

  const handleImageLoad = () => {
    const img = imageRef.current;
    if (!img) return;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    setOffset({ x: 0, y: 0 });
    setZoom(MIN_ZOOM);
  };

  const baseScale = naturalSize ? FRAME_SIZE / Math.min(naturalSize.width, naturalSize.height) : 1;
  const scale = baseScale * zoom;
  const dispW = naturalSize ? naturalSize.width * scale : FRAME_SIZE;
  const dispH = naturalSize ? naturalSize.height * scale : FRAME_SIZE;

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    dragState.current = { startX: event.clientX, startY: event.clientY, startOffset: offset };
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragState.current) return;
    const dx = event.clientX - dragState.current.startX;
    const dy = event.clientY - dragState.current.startY;
    const next = {
      x: dragState.current.startOffset.x + dx,
      y: dragState.current.startOffset.y + dy,
    };
    setOffset(clampOffset(next, dispW, dispH));
  };

  const handlePointerUp = () => {
    dragState.current = null;
  };

  const handleZoomChange = (value: number) => {
    setZoom(value);
    const nextScale = baseScale * value;
    const nextDispW = naturalSize ? naturalSize.width * nextScale : FRAME_SIZE;
    const nextDispH = naturalSize ? naturalSize.height * nextScale : FRAME_SIZE;
    setOffset((current) => clampOffset(current, nextDispW, nextDispH));
  };

  const handleSave = () => {
    const img = imageRef.current;
    if (!img || !naturalSize) return;

    setIsSaving(true);

    const sx = (dispW / 2 - FRAME_SIZE / 2 - offset.x) / scale;
    const sy = (dispH / 2 - FRAME_SIZE / 2 - offset.y) / scale;
    const sSize = FRAME_SIZE / scale;

    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT_SIZE;
    canvas.height = OUTPUT_SIZE;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsSaving(false);
      return;
    }

    ctx.drawImage(img, sx, sy, sSize, sSize, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

    canvas.toBlob((blob) => {
      setIsSaving(false);
      if (blob) onConfirm(blob);
    }, 'image/jpeg', 0.92);
  };

  return (
    <div className="acm-overlay" role="dialog" aria-modal="true" aria-label="Crop your avatar">
      <div className="acm-modal">
        <div className="acm-header">
          <h3>Crop your photo</h3>
          <button type="button" className="acm-close" onClick={onCancel} aria-label="Close">
            <FiX />
          </button>
        </div>

        <div
          className="acm-frame"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <img
            ref={imageRef}
            src={imageSrc}
            alt=""
            onLoad={handleImageLoad}
            draggable={false}
            style={{
              width: `${dispW}px`,
              height: `${dispH}px`,
              left: `${FRAME_SIZE / 2 + offset.x - dispW / 2}px`,
              top: `${FRAME_SIZE / 2 + offset.y - dispH / 2}px`,
            }}
          />
          <div className="acm-frame-ring" aria-hidden="true" />
        </div>

        <label className="acm-zoom">
          Zoom
          <input
            type="range"
            min={MIN_ZOOM}
            max={MAX_ZOOM}
            step={0.05}
            value={zoom}
            onChange={(event) => handleZoomChange(Number(event.target.value))}
          />
        </label>

        <div className="acm-footer">
          <button type="button" className="profile-btn profile-btn--ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className="profile-btn profile-btn--primary" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save photo'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AvatarCropModal;
