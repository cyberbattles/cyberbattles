// app/ctf/create-team/page.tsx
"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";

import ApiClient from "@/components/ApiClient";

// TODO: Call firebase to get aavailable scenarios

// NOTE: Not implemented modularity for multiple scenarios on the backend yet.
// For now just only setting up the basic scenario 'ubuntu-latest'

const CreateTeam = () => {

    const router = useRouter();
    const [scenario, setScenario] = useState(0);
    const [numTeams, setNumberTeams] = useState(2);
    const [numMembersPerTeam, setPlayersPerTeam] = useState(0);
    

    async function createSession() { // scenario (hardcode 0 for now), num teams, players per team
        try {
            const response = await ApiClient.post("/session", {
              "selectedScenario" : scenario,
              "numTeams" : numTeams,
              "numMembersPerTeam" : numMembersPerTeam,
              "token" : localStorage.getItem("token")
            });
            return response.data;
        } catch (error) {
            console.error("Error creating session:", error);
        }
    }

   

  
    const handleCreateSession = async () => {
      try {
        await createSession();
        router.push("/lobby");
      } catch (error) {
        console.error("Create session failed:", error);
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
                <label htmlFor="playerCount" className="block text-sm font-medium text-gray-300 mb-4">
                  Number of teams: {numTeams}
                </label>
                <div className="relative">
                  <input
                    id="playerCount"
                    type="range"
                    min="2"
                    max="5"
                    value={numMembersPerTeam}
                    onChange={(e) => setNumberTeams(parseInt(e.target.value))}
                    className="w-full h-2 bg-[#1e1e1e] rounded-lg appearance-none cursor-pointer slider"
                  />
                  <div className="flex justify-between text-sm text-gray-400 mt-2">
                    <span>2</span>
                    <span>3</span>
                    <span>4</span>
                    <span>5</span>
                  </div>
                </div>
              </div>

              <div className="w-80">
                <label htmlFor="playerCount" className="block text-sm font-medium text-gray-300 mb-4">
                  Number of Players Per Team: {numMembersPerTeam}
                </label>
                <div className="relative">
                  <input
                    id="playerCount"
                    type="range"
                    min="1"
                    max="5"
                    value={numMembersPerTeam}
                    onChange={(e) => setPlayersPerTeam(parseInt(e.target.value))}
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
                  onClick={handleCreateSession}
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