// app/ctf/teams/page.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

const TeamSelection = () => {
    const router = useRouter();
  
    const handleCreateTeam = () => {
      try {
        router.push("/create-session");
      } catch (error) {
        console.error("Navigation failed:", error);
      }
    };

    const handleJoinTeam = () => {
      try {
        router.push("/join-team");
      } catch (error) {
        console.error("Navigation failed:", error);
      }
    };
  
    return (
      <>
        {/* Fixed Navbar */}
        <Navbar />
  
        {/* Team Selection Layout */}
        <div className="flex h-screen pt-40 bg-[#2f2f2f] text-white">
          {/* Main Content */}
          <main className="flex-1 flex flex-col items-center justify-center p-8">
            {/* Header */}
            <header className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4">Get Started</h1>
            </header>
  
            {/* Team Action Buttons */}
            <section className="flex flex-col items-center space-y-8">
              <button
                className="w-80 py-6 px-8 bg-[#2f2f2f] border border-gray-600 rounded-2xl hover:border-blue-400 hover:bg-[#3a3a3a] transition font-bold text-xl shadow-md"
                onClick={handleCreateTeam}
              >
                Create Game
              </button>
              <button
                className="w-80 py-6 px-8 bg-[#2f2f2f] border border-gray-600 rounded-2xl hover:border-green-400 hover:bg-[#3a3a3a] transition font-bold text-xl shadow-md"
                onClick={handleJoinTeam}
              >
                Join Team
              </button>
            </section>
          </main>
        </div>
      </>
    );
  };
  
  export default TeamSelection;