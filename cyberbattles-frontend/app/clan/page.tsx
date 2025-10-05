// app/ctf/clan/page.tsx
'use client';

import React, {useEffect, useRef} from 'react';
import {useRouter} from 'next/navigation';

const TagBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resizeCanvas = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Gamer tags
    const tags = [
      '[Cyber]',
      '[Hack]',
      '[Binary]',
      '[Ghost]',
      '[Shadow]',
      '[Zero]',
      '[Glitch]',
      '[Matrix]',
      '[FazeBoost]',
    ];

    // Particle setup
    const particles = Array.from({length: 15}, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      speed: 0.5 + Math.random() * 1.5, // varied fall speeds
      text: tags[Math.floor(Math.random() * tags.length)],
    }));

    const draw = () => {
      if (!ctx) return;

      // Fade background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#00ff99'; // neon green
      ctx.font = '20px monospace';

      particles.forEach(p => {
        ctx.fillText(p.text, p.x, p.y);

        p.y += p.speed;

        // reset when off screen
        if (p.y > canvas.height + 30) {
          p.x = Math.random() * canvas.width;
          p.y = -20;
          p.speed = 0.5 + Math.random() * 1.5;
          p.text = tags[Math.floor(Math.random() * tags.length)];
        }
      });
    };

    const interval = setInterval(draw, 40);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none"
      style={{background: 'black'}}
    />
  );
};

const ClanSelection = () => {
  const router = useRouter();

  const handleCreateTeam = () => {
    try {
      router.push('/create-clan');
    } catch (error) {
      console.error('Navigation failed:', error);
    }
  };

  const handleJoinTeam = () => {
    try {
      router.push('/join-clan');
    } catch (error) {
      console.error('Navigation failed:', error);
    }
  };

  return (
    <>
      {/* Fixed Navbar */}
      <TagBackground />

      {/* Team Selection Layout */}
      <div className="flex h-screen pt-10 text-white">
        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center p-8">
          {/* Header */}
          <header className="text-center mb-12">
            <h1 className="text-5xl font-bold mb-4">Get Started</h1>
            <h1 className="text-2xl font-bold mb-4">
              Join your friends, or create your own CyberBattles Clan!
            </h1>
          </header>

          {/* Team Action Buttons */}
          <section className="flex flex-col items-center space-y-8">
            <button
              className="w-80 py-6 px-8 bg-[#2f2f2f] border border-gray-600 rounded-2xl hover:border-blue-400 hover:bg-[#3a3a3a] transition font-bold text-xl shadow-md"
              onClick={handleCreateTeam}
            >
              Create Clan
            </button>
            <button
              className="w-80 py-6 px-8 bg-[#2f2f2f] border border-gray-600 rounded-2xl hover:border-green-400 hover:bg-[#3a3a3a] transition font-bold text-xl shadow-md"
              onClick={handleJoinTeam}
            >
              Join Clan
            </button>
          </section>
        </main>
      </div>
    </>
  );
};

export default ClanSelection;
