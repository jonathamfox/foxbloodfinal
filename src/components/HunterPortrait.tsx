import React, { useEffect, useState } from 'react';

interface HunterPortraitProps {
  className?: string;
}

const PORTRAIT_SRC = '/assets/aistudio/WhatsApp_Image_2026-11-15_at_22.38.56_dd6a94b9.jpeg';

/**
 * Displays the high-resolution Fox Hunter illustration with exterior checkerboard
 * background cleanly keyed out via border BFS flood-fill on an offscreen canvas.
 */
export const HunterPortrait: React.FC<HunterPortraitProps> = ({ className = '' }) => {
  const [cleanSrc, setCleanSrc] = useState<string>(PORTRAIT_SRC);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = PORTRAIT_SRC;

    img.onload = () => {
      if (cancelled) return;
      try {
        const w = img.naturalWidth;
        const h = img.naturalHeight;
        const cv = document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        const ctx = cv.getContext('2d');
        if (!ctx) {
          setReady(true);
          return;
        }
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, w, h);
        const d = imgData.data;
        const total = w * h;
        const visited = new Uint8Array(total);
        const queue = new Int32Array(total);
        let head = 0;
        let tail = 0;

        const isNeutralChecker = (idx: number) => {
          const o = idx * 4;
          const r = d[o];
          const g = d[o + 1];
          const b = d[o + 2];
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const sat = max - min;
          const lum = (r + g + b) / 3;
          return sat <= 16 && lum <= 80;
        };

        const seed = (idx: number) => {
          if (!visited[idx] && isNeutralChecker(idx)) {
            visited[idx] = 1;
            queue[tail++] = idx;
          }
        };

        for (let x = 0; x < w; x++) {
          seed(x);
          seed((h - 1) * w + x);
        }
        for (let y = 0; y < h; y++) {
          seed(y * w);
          seed(y * w + (w - 1));
        }

        while (head < tail) {
          const idx = queue[head++];
          const o = idx * 4;
          d[o + 3] = 0;
          const x = idx % w;
          const y = (idx - x) / w;
          if (x > 0) seed(idx - 1);
          if (x + 1 < w) seed(idx + 1);
          if (y > 0) seed(idx - w);
          if (y + 1 < h) seed(idx + w);
        }

        // Feather 1px border of removed region for smoother silhouette edge
        for (let i = 0; i < total; i++) {
          if (visited[i]) continue;
          const x = i % w;
          const y = (i - x) / w;
          const adjRemoved =
            (x > 0 && visited[i - 1]) ||
            (x + 1 < w && visited[i + 1]) ||
            (y > 0 && visited[i - w]) ||
            (y + 1 < h && visited[i + w]);
          if (adjRemoved) {
            const o = i * 4;
            const max = Math.max(d[o], d[o + 1], d[o + 2]);
            const min = Math.min(d[o], d[o + 1], d[o + 2]);
            if (max - min <= 18 && (d[o] + d[o + 1] + d[o + 2]) / 3 < 72) {
              d[o + 3] = 95;
            }
          }
        }

        ctx.putImageData(imgData, 0, 0);
        setCleanSrc(cv.toDataURL('image/png'));
      } catch {
        // Fallback to raw image if canvas read fails
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    img.onerror = () => {
      if (!cancelled) setReady(true);
    };

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className={`relative select-none pointer-events-none ${className}`}>
      <div
        className="absolute inset-4 rounded-full blur-2xl opacity-45"
        style={{
          background:
            'radial-gradient(circle at 60% 52%, rgba(232, 148, 56, 0.36), rgba(90, 32, 48, 0.16) 55%, transparent 78%)',
        }}
      />
      <img
        src={cleanSrc}
        alt="A Raposa Caçadora de Velmora com lanterna e lâmina serrilhada"
        referrerPolicy="no-referrer"
        className={`relative w-full h-auto object-contain transition-opacity duration-300 drop-shadow-[0_12px_28px_rgba(0,0,0,0.85)] ${
          ready ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};
