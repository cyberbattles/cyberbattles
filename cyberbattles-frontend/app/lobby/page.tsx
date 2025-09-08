"use client";
import React, { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import GameEndPopup from "@/components/GameEndPopup";

const Lobby = () => {
  const router = useRouter();
  const [players, setPlayers] = useState([]);
  const [currentScenario, setCurrentScenario] = useState("");
  const [gameStatus, setGameStatus] = useState("waiting"); // waiting, starting, active
  const [isHost, setIsHost] = useState(false);
  const [teamName, setTeamName] = useState("");
  const [showGameEndPopup, setShowGameEndPopup] = useState(false);



  // TODO: Setup backend call to get player, scenario and teams information
  // TODO: Check whether the user is authenticated as an admin or a regular player
  // and show actions appropriately

  // These additions are present in the Big Beautiful Pull Request ™️


  // TODO: This component shall be moved to the Terminal Page as it should appear
  // at the end of a game. 
  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  // TODO: remove these 2 functions, they are just there to see how the popup looks.
  const toggleHost = (isHost: boolean,setIsHost: { (value: React.SetStateAction<boolean>): void; (arg0: boolean): void; }) => {
    setIsHost(!isHost);
  }; 

  const toggleEndGame = (showGameEndPopup: boolean,setShowGameEndPopup: { (value: React.SetStateAction<boolean>): void; (arg0: boolean): void; }) => {
    setShowGameEndPopup(!showGameEndPopup);
  };

  const handleLeaveLobby = () => {
    router.push("/dashboard");
    // TODO: Implement functionality which removes the user from the scenario and team
  };

  const handleStartGame = () => {

  };

 

  return (
    <>
      <GameEndPopup
        isVisible={showGameEndPopup}
        onClose={() => setShowGameEndPopup(false)}
        winningTeam="Red Team"
        isAdmin= {isHost}
        gameScore={{
          team1: { name: "Red Team", score: 850 },
          team2: { name: "Blue Team", score: 720 } 
        }}
      />  
      {/* Fixed Navbar */}
      <Navbar />

      {/* Lobby Layout */}
      <div className="flex h-screen pt-40 bg-[#2f2f2f] text-white">
        {/* Sidebar */}
        <aside className="w-64 bg-[#1e1e1e] shadow-md">
          <div className="p-6 text-xl font-bold border-b border-gray-700">
            Game Lobby
          </div>
          <nav className="p-6">
            <ul className="space-y-4">
              <li>
                <div className="text-sm text-gray-400">Team:</div>
                <div className="font-semibold text-blue-400">Team 1</div>
              </li>
              <li>
                <div className="text-sm text-gray-400">Players:</div>
                <div className="font-semibold">{players.length}/2</div>
              </li>
              <li>
                <div className="text-sm text-gray-400">Status:</div>
                <div className={`font-semibold capitalize ${
                  gameStatus === "waiting" ? "text-yellow-400" :
                  gameStatus === "starting" ? "text-blue-400" :
                  "text-green-400"
                }`}>
                  {gameStatus === "starting" ? "Starting..." : gameStatus}
                </div>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-auto">
          {/* Header */}
          <header className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold">Game Lobby</h1>
            <div className="flex gap-4">
              <button
                className="px-4 py-2 bg-gray-600 rounded-xl hover:opacity-90 transition font-bold"
                onClick={handleLeaveLobby}
              >
                Leave Lobby
              </button>
              <button
                className="px-4 py-2 bg-blue-600 rounded-xl hover:opacity-90 transition font-bold"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </header>

          {/* Lobby Content */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Scenario */}
            <div className="p-6 bg-[#1e1e1e] rounded-2xl shadow-md lg:col-span-2">
              <h2 className="text-xl font-semibold mb-4 text-blue-400">Current Scenario</h2>
              <p className="text-gray-300 leading-relaxed">
                {currentScenario}
              </p>
              {gameStatus === "starting" && (
                <div className="mt-4 p-3 bg-blue-900/30 border border-blue-500 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                    <span className="text-blue-400 font-semibold">Game starting in 3 seconds...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Players List */}
            <div className="p-6 bg-[#1e1e1e] rounded-2xl shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-green-400">Players</h2>
              <div className="space-y-3">
                {players.map((player) => (
                  <div className="flex items-center justify-between p-3 bg-[#2f2f2f] rounded-lg">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">PlayerName</span>
                    </div>
                    
                  </div>
                ))}
              </div>
            </div>

            {/* Game Controls */}
            <div className="p-6 bg-[#1e1e1e] rounded-2xl shadow-md">
              
              {isHost && (
                <div className="space-y-4">
                  <div className="p-3 bg-[#2f2f2f] rounded-lg">
                    <div className="text-sm text-gray-400 mb-1">Host Controls</div>
                    <button
                      onClick={handleStartGame}
                      disabled={gameStatus === "starting"}
                      className={`w-full px-4 py-3 rounded-xl font-bold transition ${
                        gameStatus !== "starting"
                          ? "bg-green-600 hover:opacity-90"
                          : "bg-gray-600 cursor-not-allowed opacity-50"
                      }`}
                    >
                      {gameStatus === "starting" ? "Starting Game..." : "Start Game"}
                    </button>
                    
                    
                   
                  </div>
                </div>
              )}

              <div className="mt-4 p-3 bg-[#2f2f2f] rounded-lg">
                <div className="text-sm text-gray-400 mb-2">Scenario Info</div>
                <div className="text-sm space-y-1">
                  <div>Name: ubuntu - basic</div>
                  <div>Challenges: 5</div>
                  <div>Difficulty: Beginner</div>
                </div>
                
                {/* TODO: These 2 buttons need to be removed once functionality is fully implemented */}
                <button className="px-4 py-2 bg-green-600 rounded-xl hover:opacity-90 transition font-bold mb-2"

                      onClick={() => toggleHost(isHost,setIsHost)}
                      >
                  {isHost ? "Remove Host" : "Become Host"}

                </button>
                <div>
                  

                </div>
                <button className="px-4 py-2 bg-red-600 rounded-xl hover:opacity-90 transition font-bold mb-2"

                  onClick={() => toggleEndGame(showGameEndPopup, setShowGameEndPopup)}
                  >
                  {showGameEndPopup ? "Hide End Game Popup" : "Show End Game Popup"}
                </button>

              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
};

export default Lobby;