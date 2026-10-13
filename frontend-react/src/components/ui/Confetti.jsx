import { useEffect, useRef } from 'react';

// Brand-led palette: the app lime and charcoal, with a few warm accents.
const COLORS = ['#DFFF83', '#B7DA3E', '#17191A', '#F5C451', '#7FB3F5', '#FFFFFF'];
const PIECES = 140;
const DURATION_MS = 3200;

/**
 * A single, light confetti burst for moments worth celebrating. Plain canvas,
 * no library. Two bursts fire from the lower corners, drift down with a
 * little flutter, and fade out; the canvas then removes itself. Nothing
 * renders for people who ask for reduced motion.
 */
export function Confetti() {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return undefined;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const w = window.innerWidth;
    const h = window.innerHeight;
    const rand = (a, b) => a + Math.random() * (b - a);
    const pieces = Array.from({ length: PIECES }, (_, i) => {
      const fromLeft = i % 2 === 0;
      const angle = fromLeft ? rand(-75, -40) : rand(-140, -105); // degrees, up and inwards
      const speed = rand(9, 17);
      return {
        x: fromLeft ? rand(-10, w * 0.08) : rand(w * 0.92, w + 10),
        y: h + rand(0, 30),
        vx: Math.cos((angle * Math.PI) / 180) * speed,
        vy: Math.sin((angle * Math.PI) / 180) * speed,
        size: rand(6, 11),
        ratio: rand(0.4, 1),
        rot: rand(0, Math.PI * 2),
        spin: rand(-0.25, 0.25),
        flutter: rand(0, Math.PI * 2),
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        round: Math.random() < 0.25,
      };
    });

    const started = performance.now();
    let frame;
    const tick = (now) => {
      const t = now - started;
      ctx.clearRect(0, 0, w, h);
      const fade = t > DURATION_MS - 800 ? Math.max(0, (DURATION_MS - t) / 800) : 1;
      pieces.forEach((p) => {
        p.vy += 0.32; // gravity
        p.vx *= 0.985; // air
        p.vy *= 0.985;
        p.flutter += 0.12;
        p.x += p.vx + Math.sin(p.flutter) * 0.6;
        p.y += p.vy;
        p.rot += p.spin;
        ctx.save();
        ctx.globalAlpha = fade;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.color === '#FFFFFF') {
          ctx.strokeStyle = 'rgba(23,25,26,0.12)';
          ctx.lineWidth = 1;
        }
        if (p.round) {
          ctx.beginPath();
          ctx.arc(0, 0, p.size * 0.35, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Width shrinks with the flutter so pieces look like they tumble.
          const pw = p.size * Math.abs(Math.cos(p.flutter));
          ctx.fillRect(-pw / 2, -(p.size * p.ratio) / 2, pw, p.size * p.ratio);
          if (p.color === '#FFFFFF') ctx.strokeRect(-pw / 2, -(p.size * p.ratio) / 2, pw, p.size * p.ratio);
        }
        ctx.restore();
      });
      if (t < DURATION_MS) frame = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, w, h);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className="fixed inset-0 w-screen h-screen pointer-events-none z-[70]" />;
}

export default Confetti;
