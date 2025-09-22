"use client";
import React, { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { auth } from "../lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { useRouter } from "next/navigation";

import cyberbattles from "../public/images/cyberbattles.png";

// https://claude.ai/chat/5a4af02b-ce13-4936-86fc-e3fbc403427a

const MatrixBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return; // safety check
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resizeCanvas = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // Matrix rain effect
    const columns = Math.floor(canvas.width / 20);
    const drops = Array(columns).fill(0);

    const draw = () => {
      if (!ctx) return;

      // Black background with slight transparency for trail effect
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Green text
      ctx.fillStyle = "#00ff41";
      ctx.font = "16px monospace";

      for (let i = 0; i < drops.length; i++) {
        const text = Math.random() > 0.8 ? "1" : "0";
        ctx.fillText(text, i * 20, drops[i] * 20);

        if (drops[i] * 20 > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    };

    const interval = setInterval(draw, 100);

    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed top-0 left-0 w-full h-full -z-10 pointer-events-none"
      style={{ background: "black" }}
    />
  );
};

export default function HomePage() {
  return (
    <div className="relative h-screen overflow-hidden">
      <Navbar />
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
          </section>
        </div>
      </div>
    </div>
  );
}
