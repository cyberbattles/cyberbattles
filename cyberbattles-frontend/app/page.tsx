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
  let navItems = ["Home", "lab", "learn"];
  let navLinks = ["/", "/test", "/learn"];

  return (
    <div className="relative">
      <Navbar loggedIn={false} />
      {/* Matrix Background */}
      <MatrixBackground />
      
      {/* Your existing content */}
      <div className="relative z-10">
        {/* Navbar would go here */}
        <div className="p-10"></div>
        <div className="p-10">
          <section className="min-h-screen flex flex-col items-center justify-center text-center pb-100">
            <h1 className="text-5xl font-extrabold text-white mb-2 drop-shadow-lg">
              CyberBattles.
            </h1>
            <p className="text-lg text-white-500 drop-shadow-lg italic font-bold">
              A red hat vs blue hat interactive training experience.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};