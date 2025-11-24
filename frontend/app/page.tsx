'use client';
import React, {useEffect, useRef} from 'react';
import logo from '../public/images/title_logo.png';
import Image from 'next/image';

const MatrixBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return; // safety check
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Matrix rain effect
    const columns = Math.floor(canvas.width / 20);

    // Initialize each drop with a random negative value so they start staggered
    const drops = Array.from(
      {length: columns},
      () => Math.floor(Math.random() * -50), // random delay before appearing
    );

    const draw = () => {
      if (!ctx) return;

      // Black background with slight transparency for trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Green text
      ctx.fillStyle = '#dc302f';
      ctx.font = '16px monospace';

      for (let i = 0; i < drops.length; i++) {
        if (drops[i] > 0) {
          const text = Math.random() > 0.8 ? '1' : '0';
          ctx.fillText(text, i * 20, drops[i] * 20);
        }

        if (i % 2 === 0) {
          ctx.fillStyle = '#266cab';
        } else {
          ctx.fillStyle = '#dc302f';
        }

        if (drops[i] * 20 > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 100);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none"
      style={{background: 'black', filter: 'blur(5px)'}}
    />
  );
};

export default function HomePage() {
  return (
    <div className="relative h-screen overflow-hidden">
      <MatrixBackground />

      <div className="relative z-10">
        <div className="">
          <section className="h-screen flex flex-col items-center justify-center text-center">
            <div className="p-5 pb-0 w-sm md:w-2xl select-none">
              <Image
                src={logo}
                alt="website logo"
                width={600}
                height={300}
                className="object-contain"
                draggable={false}
              />
            </div>
            <p className="text-md sm:text-lg md:text-xl text-white-500 drop-shadow-lg font-bold p-4">
              An educational attack and defence CTF platform.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
