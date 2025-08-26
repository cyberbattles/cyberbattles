"use client";
import React, { useState } from "react";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { auth } from "../lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { useRouter } from "next/navigation";

import cyberbattles from "../public/images/cyberbattles.png";

export default function HomePage() {
  let navItems = ["Home", "lab", "learn"];
  let navLinks = ["/", "/test", "/learn"];

  return (
    <>
      <Navbar />
      <div className="p-10"></div>
      <div className="p-10">
        <section className="min-h-screen flex items-center justify-start pl-150">
          {/* Your content goes here */}
        </section>
      </div>
    </>
  );
}
