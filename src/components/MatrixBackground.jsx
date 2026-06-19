import { useEffect, useRef } from 'react';

const CHARS = '01アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン';

function randomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)];
}

export default function MatrixBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const fontSize = 12;
    let cols = Math.floor(canvas.width / fontSize);
    const drops = Array(cols).fill(1);

    const draw = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.font = `${fontSize}px JetBrains Mono, monospace`;

      for (let i = 0; i < drops.length; i++) {
        const text = randomChar();
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        // Head of column glows brighter
        if (drops[i] * fontSize < canvas.height * 0.2) {
          ctx.fillStyle = 'rgba(0, 255, 65, 0.9)';
        } else {
          ctx.fillStyle = `rgba(0, ${Math.floor(80 + Math.random() * 80)}, ${Math.floor(20 + Math.random() * 30)}, ${0.1 + Math.random() * 0.2})`;
        }

        ctx.fillText(text, x, y);

        if (y > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const id = setInterval(draw, 50);
    return () => {
      clearInterval(id);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas ref={canvasRef}
      style={{
        position: 'fixed', top: 0, left: 0,
        width: '100vw', height: '100vh',
        zIndex: 0, opacity: 0.18, pointerEvents: 'none',
      }}
    />
  );
}
