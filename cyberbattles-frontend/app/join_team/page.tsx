"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

const JoinTeam = () => {
    const router = useRouter();
    const [teamCode, setTeamCode] = useState("");
  
    const handleJoinTeam = async () => {
      try {
        if (!teamCode.trim()) {
          alert("Please enter a team code");
          return;
        }
        // TODO: Add team joining logic here
        console.log("Joining team with code:", teamCode);
        router.push("/dashboard");
      } catch (error) {
        console.error("Join team failed:", error);
      }
    };

    const handleBackToSelection = () => {
      try {
        router.push("/team");
      } catch (error) {
        console.error("Navigation failed:", error);
      }
    };
  
    return (
      <>
        {/* Fixed Navbar */}
        <Navbar />
  
        {/* Join Team Layout */}
        <div className="flex h-screen pt-40 bg-[#2f2f2f] text-white">
          {/* Main Content */}
          <main className="flex-1 flex flex-col items-center justify-center p-8">
            {/* Header */}
            <header className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4">Join Team</h1>
              <p className="text-lg text-gray-300">Enter your team code to join the challenge</p>
            </header>
  
            {/* Join Form */}
            <section className="flex flex-col items-center space-y-8">
              <div className="w-80">
                <label htmlFor="teamCode" className="block text-sm font-medium text-gray-300 mb-2">
                  Team Code
                </label>
                <input
                  id="teamCode"
                  type="text"
                  value={teamCode}
                  onChange={(e) => setTeamCode(e.target.value)}
                  placeholder="Enter team code..."
                  className="w-full px-4 py-3 bg-[#1e1e1e] border border-gray-600 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition"
                />
              </div>
              
              <div className="flex flex-col items-center space-y-4">
                <button
                  className="w-80 py-4 px-8 bg-green-600 rounded-2xl hover:opacity-90 transition font-bold text-xl shadow-md"
                  onClick={handleJoinTeam}
                >
                  Join Team
                </button>
                <button
                  className="w-80 py-3 px-8 bg-gray-600 rounded-2xl hover:opacity-90 transition font-semibold text-lg shadow-md"
                  onClick={handleBackToSelection}
                >
                  Back to Selection
                </button>
              </div>
            </section>
          </main>
        </div>
      </>
    );
  };
  
  export default JoinTeam;