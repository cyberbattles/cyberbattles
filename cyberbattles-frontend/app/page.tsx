'use client';
import React, {useEffect, useRef, useState} from 'react';
import Image from 'next/image';
import {auth} from '../lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  User,
  onAuthStateChanged,
} from 'firebase/auth';
import { useRouter } from 'next/navigation'; 

// https://claude.ai/chat/5a4af02b-ce13-4936-86fc-e3fbc403427a
// https://chatgpt.com/s/t_68d0c7af94bc819199a17e1c7a2da6c4


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
      ctx.fillStyle = '#00ff41';
      ctx.font = '16px monospace';

      for (let i = 0; i < drops.length; i++) {
        if (drops[i] > 0) {
          const text = Math.random() > 0.8 ? '1' : '0';
          ctx.fillText(text, i * 20, drops[i] * 20);
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
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, currentUser => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const router = useRouter();
  const handleDashboard = async () => {
    try {
      if (user != null) {
      router.push('/dashboard'); 
      } else {
        router.push('/login')
      }
    } catch (error) {
      console.error('Navigation failed:', error);
    }
  };
  return (
    <div className="relative h-screen overflow-hidden">
      <MatrixBackground />

      <div className="relative z-10">
        <div className="">
          <section className="h-screen flex flex-col items-center justify-center text-center">
            <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold text-white mb-2 drop-shadow-lg">
              CyberBattl.es
            </h1>
            <p className="text-md sm:text-lg md:text-xl text-white-500 drop-shadow-lg italic font-bold p-4">
              An educational attack and defence CTF platform.
            </p>
            <button
              className="relative px-10 py-4 mt-6 text-2xl font-bold rounded-xl 
              overflow-hidden transition-all duration-300 
              hover:text-black hover:bg-green-400 
              shadow-[0_0_5px_#00ff41,0_0_5px_#00ff41] hover:shadow-[0_0_5px_#00ff41,0_0_60px_#00ff41]"
              onClick={handleDashboard}
            >
              <span className="relative z-10">Start Playing Today!</span>
              <span className="absolute inset-0 bg-green-400/20 blur-xl animate-pulse"></span>
            </button>
  
          </section>
        </div>
      </div>
    </div>
  );
}
