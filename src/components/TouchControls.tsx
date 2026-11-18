import React, { useRef } from 'react';

interface TouchControlsProps {
  hidden: boolean;
  energy: number;
  showSpellBtn?: boolean;
  onKey: (k: string, down: boolean) => void;
  onMove: (left: boolean, right: boolean) => void;
  onPause: () => void;
}

export const TouchControls: React.FC<TouchControlsProps> = ({
  hidden,
  energy,
  showSpellBtn = false,
  onKey,
  onMove,
  onPause,
}) => {
  const stickRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);

  const handleStickMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const stick = stickRef.current;
    const knob = knobRef.current;
    if (!stick || !knob) return;
    const r = stick.getBoundingClientRect();
    const dx = Math.max(-1, Math.min(1, (e.clientX - r.left - r.width / 2) / 40));
    const dy = Math.max(-1, Math.min(1, (e.clientY - r.top - r.height / 2) / 40));
    knob.style.transform = `translate(${dx * 34}px, ${dy * 34}px)`;
    onMove(dx < -0.3, dx > 0.3);
  };

  const handleStickEnd = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== pointerIdRef.current) return;
    pointerIdRef.current = null;
    if (knobRef.current) knobRef.current.style.transform = '';
    onMove(false, false);
  };

  const bindBtn = (k: string) => ({
    onPointerDown: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.classList.add('on');
      onKey(k, true);
    },
    onPointerUp: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.classList.remove('on');
      onKey(k, false);
    },
    onPointerCancel: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.preventDefault();
      e.currentTarget.classList.remove('on');
      onKey(k, false);
    },
    onPointerLeave: (e: React.PointerEvent<HTMLButtonElement>) => {
      e.currentTarget.classList.remove('on');
      onKey(k, false);
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });

  const specialReady = energy >= 100;

  return (
    <>
      <button type="button" className="pausebtn" aria-label="Pausa" onClick={onPause}>
        II
      </button>

      <div className="rotate" aria-live="polite">
        <svg viewBox="0 0 24 24">
          <rect x="3" y="8" width="18" height="10" rx="2" />
          <path d="M8 5a6 6 0 0 1 8 0M16 5l.3-2.2M16 5l-2.2.2" />
        </svg>
        <h2 className="font-display text-2xl font-normal m-0">Gire o celular</h2>
        <p className="m-0 text-[var(--mist)] max-w-[28ch]">
          Fox Borne só se joga deitado, em tela cheia.
        </p>
      </div>

      <div
        className="touch"
        style={{ visibility: hidden ? 'hidden' : 'visible' }}
      >
        <div
          ref={stickRef}
          className="stick"
          role="group"
          aria-label="Alavanca de movimento"
          onPointerDown={(e) => {
            e.preventDefault();
            pointerIdRef.current = e.pointerId;
            try {
              e.currentTarget.setPointerCapture(e.pointerId);
            } catch {
              // ignore
            }
            handleStickMove(e);
          }}
          onPointerMove={(e) => {
            if (e.pointerId === pointerIdRef.current) handleStickMove(e);
          }}
          onPointerUp={handleStickEnd}
          onPointerCancel={handleStickEnd}
          onContextMenu={(e) => e.preventDefault()}
        >
          <i>◀</i>
          <i>▶</i>
          <div ref={knobRef} className="knob" />
        </div>

        <div className="acts">
          <button type="button" className="b-atk" aria-label="Golpe" {...bindBtn('atk')}>
            <svg viewBox="0 0 24 24">
              <path d="M4 18C10 17 17 11 19 4c1 8-5 15-15 14z" fill="currentColor" />
            </svg>
          </button>
          <button type="button" className="b-roll" aria-label="Rolar" {...bindBtn('roll')}>
            <svg viewBox="0 0 24 24">
              <path d="M5 6l6 6-6 6M13 6l6 6-6 6" />
            </svg>
          </button>
          <button type="button" className="b-heavy" aria-label="Golpe forte" {...bindBtn('heavy')}>
            <svg viewBox="0 0 24 24">
              <path d="M7 17L19 5v4M19 5h-4M4 14l6 6M5 19l2-2" />
            </svg>
          </button>
          <button type="button" className="b-use" aria-label="Usar escada ou passagem" {...bindBtn('use')}>
            <svg viewBox="0 0 24 24">
              <path d="M5 21V3M19 21V3M5 6h14M5 12h14M5 18h14" />
            </svg>
          </button>
          <button
            type="button"
            className={`sm b-special ${specialReady ? 'ready' : ''}`}
            style={{ '--energy': `${energy}%` } as React.CSSProperties}
            aria-label={specialReady ? 'Especial pronto' : `Especial ${energy}%`}
            {...bindBtn('special')}
          >
            <svg viewBox="0 0 24 24">
              <path d="M12 3a9 9 0 1 1-6.4 2.6M5.6 2.5v3.6h3.6" />
              <circle cx="12" cy="12" r="2.2" fill="currentColor" />
            </svg>
          </button>
          <button type="button" className="sm b-heal" aria-label="Frasco" {...bindBtn('heal')}>
            <svg viewBox="0 0 24 24">
              <path d="M10 3h4M10.5 3v5.5a6 6 0 1 0 3 0V3M7 14h10" />
            </svg>
          </button>
          {showSpellBtn && (
            <button type="button" className="sm b-spell" aria-label="Alternar feitiço" {...bindBtn('spell')}>
              <svg viewBox="0 0 24 24">
                <path d="M12 3l2.2 5.2L19.5 10l-5.3 1.8L12 17l-2.2-5.2L4.5 10l5.3-1.8z" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </>
  );
};
