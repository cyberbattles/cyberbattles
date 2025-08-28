// app/ctf/create-team/page.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

const CreateTeam = () => {
    const router = useRouter();
    const [teamName, setTeamName] = useState("");
    const [playerCount, setPlayerCount] = useState(3);
  
    const handleCreateTeam = async () => {
      try {
        if (!teamName.trim()) {
          alert("Please enter a team name");
          return;
        }
        // TODO: Add team creation logic here
        console.log("Creating team:", { name: teamName, playerCount });
        router.push("/dashboard");
      } catch (error) {
        console.error("Create team failed:", error);
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
  
        {/* Create Team Layout */}
        <div className="flex h-screen pt-40 bg-[#2f2f2f] text-white">
          {/* Main Content */}
          <main className="flex-1 flex flex-col items-center justify-center p-8">
            {/* Header */}
            <header className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4">Create Team</h1>
            </header>
  
            {/* Create Team Form */}
            <section className="flex flex-col items-center space-y-8">
              <div className="w-80">
                <label htmlFor="teamName" className="block text-sm font-medium text-gray-300 mb-2">
                  Team Name
                </label>
                <input
                  id="teamName"
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Enter team name..."
                  className="w-full px-4 py-3 bg-[#1e1e1e] border border-gray-600 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition"
                />
              </div>

              <div className="w-80">
                <label htmlFor="playerCount" className="block text-sm font-medium text-gray-300 mb-4">
                  Number of Players: {playerCount}
                </label>
                <div className="relative">
                  <input
                    id="playerCount"
                    type="range"
                    min="1"
                    max="5"
                    value={playerCount}
                    onChange={(e) => setPlayerCount(parseInt(e.target.value))}
                    className="w-full h-2 bg-[#1e1e1e] rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-sm text-gray-400 mt-2">
                    <span>1</span>
                    <span>2</span>
                    <span>3</span>
                    <span>4</span>
                    <span>5</span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-center space-y-4">
                <button
                  className="w-80 py-4 px-8 bg-[#2f2f2f] border border-gray-600 rounded-2xl hover:border-blue-400 hover:bg-[#3a3a3a] transition font-bold text-xl shadow-md"
                  onClick={handleCreateTeam}
                >
                  Create Team
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

        <style jsx>{`
          .slider::-webkit-slider-thumb {
            appearance: none;
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: #3b82f6;
            cursor: pointer;
            border: 2px solid #1e1e1e;
          }

          .slider::-moz-range-thumb {
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: #3b82f6;
            cursor: pointer;
            border: 2px solid #1e1e1e;
          }

          .slider::-webkit-slider-track {
            background: #1e1e1e;
            border-radius: 5px;
          }

          .slider::-moz-range-track {
            background: #1e1e1e;
            border-radius: 5px;
          }
        `}</style>
      </>
    );
  };
  
  export default CreateTeam;