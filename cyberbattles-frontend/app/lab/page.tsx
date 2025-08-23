"use client";
import React, { useState } from "react";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";


export default function LabPage() {
    const router = useRouter();


  return (
    <>
      <Navbar loggedIn={false} />
      <div className="p-10"></div>
      <div className="p-10">
        <section className="min-h-screen flex items-center justify-start pl-150">
          {/* Your content goes here */}
        </section>
      </div>
    </>
  );
}
