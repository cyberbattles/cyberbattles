"use client";
import React from "react";
import { useRouter } from "next/navigation";

interface GameEndPopupProps {
  isVisible: boolean;
  onClose: () => void;
  winningTeam: string;
  isAdmin?: boolean;
  gameScore?: {
    team1: { name: string; score: number };
    team2: { name: string; score: number };
  };
}

const GameEndPopup: React.FC<GameEndPopupProps> = ({
  isVisible,
  onClose,
  winningTeam,
  isAdmin,
  gameScore
}) => {
  const router = useRouter();

  if (!isVisible) return null;

  const handleViewLeaderboard = () => {
    router.push("/leaderboard");
    onClose();
  };

  const handleViewTraffic = () => {
    router.push("/network_traffic");
    onClose();
  };

  const handleViewMaterials = () => {
    router.push("/learn");
    onClose();
  };

  const handleCreateNewGame = () => {
    router.push("/create_scenario");
    onClose();
  };

  const handleBackToDashboard = () => {
    router.push("/dashboard");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-51 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Popup Content */}
      <div className="relative bg-[#1e1e1e] border border-gray-600 rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden">
        {/* Header with celebration effect */}
        <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 p-6 text-center">
          <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/20 to-orange-400/20 animate-pulse" />
          <div className="relative">
            <h1 className="text-3xl font-bold text-white mb-2">🎉 Game Complete! 🎉</h1>
            <div className="text-xl text-yellow-200 font-semibold">
              Winner: <span className="text-yellow-100">{winningTeam}</span>
            </div>
          </div>
        </div>

        {/* Game Results */}
        {gameScore && (
          <div className="p-6 border-b border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-center text-blue-400">Final Scores</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className={`p-4 rounded-xl text-center ${
                gameScore.team1.name === winningTeam 
                  ? "bg-green-900/30 border border-green-500" 
                  : "bg-[#2f2f2f]"
              }`}>
                <div className="text-lg font-semibold text-white">{gameScore.team1.name}</div>
                <div className={`text-2xl font-bold ${
                  gameScore.team1.name === winningTeam ? "text-green-400" : "text-gray-400"
                }`}>
                  {gameScore.team1.score}
                </div>
              </div>
              <div className={`p-4 rounded-xl text-center ${
                gameScore.team2.name === winningTeam 
                  ? "bg-green-900/30 border border-green-500" 
                  : "bg-[#2f2f2f]"
              }`}>
                <div className="text-lg font-semibold text-white">{gameScore.team2.name}</div>
                <div className={`text-2xl font-bold ${
                  gameScore.team2.name === winningTeam ? "text-green-400" : "text-gray-400"
                }`}>
                  {gameScore.team2.score}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* View Leaderboard */}
            <button
              onClick={handleViewLeaderboard}
              className="flex items-center justify-center gap-3 p-4 bg-yellow-600 hover:bg-yellow-700 rounded-xl transition font-semibold text-white"
            >
              <span className="text-xl">🏆</span>
              View Leaderboard
            </button>

            {/* View Traffic */}
            <button
              onClick={handleViewTraffic}
              className="flex items-center justify-center gap-3 p-4 bg-blue-600 hover:bg-blue-700 rounded-xl transition font-semibold text-white"
            >
              <span className="text-xl">📊</span>
              View Network Traffic
            </button>

            {/* Conditional third button */}
            {isAdmin ? (
              <button
                onClick={handleCreateNewGame}
                className="flex items-center justify-center gap-3 p-4 bg-green-600 hover:bg-green-700 rounded-xl transition font-semibold text-white sm:col-span-2"
              >
                <span className="text-xl">🎮</span>
                Create New Game
              </button>
            ) : (
              <button
                onClick={handleViewMaterials}
                className="flex items-center justify-center gap-3 p-4 bg-purple-600 hover:bg-purple-700 rounded-xl transition font-semibold text-white sm:col-span-2"
              >
                <span className="text-xl">📚</span>
                View Learning Materials
              </button>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleBackToDashboard}
              className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 rounded-xl transition font-semibold text-white"
            >
              Back to Dashboard
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-[#2f2f2f] hover:bg-gray-700 border border-gray-600 rounded-xl transition font-semibold text-white"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameEndPopup;