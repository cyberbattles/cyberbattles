'use client';
import React, {useEffect, useState} from 'react';
import {auth, db} from '@/lib/firebase';
import {doc, getDoc} from 'firebase/firestore';
import {useRouter} from 'next/navigation';

interface GameEndPopupProps {
  isVisible: boolean;
  isAdmin: boolean;
  isOpen: boolean;
  onClose: () => void;
  sessionId: string;
  continueAdministering: boolean;
}

const GameEndPopup: React.FC<GameEndPopupProps> = ({
  isVisible,
  isAdmin,
  isOpen,
  onClose,
  sessionId,
  continueAdministering,
}) => {
  if (!isOpen) {
    return null;
  }

  const router = useRouter();
  const [scores, setScores] = useState<Map<string, [string, number]>>(
    new Map(),
  );
  const [winners, setWinners] = useState<string[]>(['']);

  if (!isVisible) return null;

  // Populate the scores
  useEffect(() => {
    const getScores = async () => {
      if (!sessionId) {
        return;
      }
      const finishedRef = doc(db, 'finishedSessions', sessionId);
      const finishedSnap = await getDoc(finishedRef);
      if (!finishedSnap.exists()) {
        return;
      }

      const scoreMap = new Map();

      const finishedData = finishedSnap.data();
      const results = finishedData.results;
      Object.keys(results).forEach(id => {
        const pair = results[id];
        const teamName = pair[0];
        const score = pair[1];
        scoreMap.set(id, [teamName, score]);
      });
      setScores(scoreMap);
    };
    getScores();
  }, [sessionId]);

  // Get winners
  useEffect(() => {
    // Get the high score
    let winners: string[] = [];
    let highScore: number | null = null;
    scores.forEach((value, key) => {
      let id = key;
      let teamName = value[0];
      let score = value[1];
      if (highScore == null || score > highScore) {
        highScore = score;
        winners = [teamName];
      } else if (score == highScore) {
        winners = winners.concat([teamName]);
      }
    });
    setWinners(winners);
  }, [scores]);

  // Add the given team id's score to the scores map
  const addTeamScore = async (id: string) => {
    const teamDoc = doc(db, 'teams', id);
    const teamSnap = await getDoc(teamDoc);
    if (!teamSnap.exists()) {
      return;
    }
    const teamData = teamSnap.data();
    const teamName = teamData.name;
    const score = teamData.totalScore;
    scores.set(id, [teamName, score]);
    setScores(new Map(scores));
  };

  const handleViewLeaderboard = () => {
    router.push('/leaderboard');
    onClose();
  };

  const handleViewTraffic = () => {
    router.push('/network-traffic');
    onClose();
  };

  const handleViewMaterials = () => {
    router.push('/reports');
    onClose();
  };

  const handleCreateNewGame = () => {
    router.push('/create-session');
    onClose();
  };

  const handleBackToDashboard = () => {
    router.push('/dashboard');
    onClose();
  };

  const handleBackToAdmin = () => {
    router.push('/admin');
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
      <div className="relative bg-[#2E2D2D] rounded-2xl shadow-2xl max-w-2xl w-full mx-4 overflow-hidden">
        {/* Header with celebration effect */}
        <div className="relative bg-[#1e1e1e] p-6 text-center">
          <div className="relative">
            <h1 className="text-3xl font-bold text-white mb-2">
              Game Finished
            </h1>
            {winners.length == 1 && (
              <div className="text-xl text-blue-400 font-semibold">
                Winner:
                <br /> <span className="text-blue-400">{winners[0]}</span>
              </div>
            )}
            {winners.length > 1 && (
              <div className="text-xl text-blue-400 font-semibold">
                Tie:
                <br />{' '}
                {winners.map((winner, index) => (
                  <span key={winner} className="text-blue-400">
                    {' '}
                    {winner} {index !== winners.length - 1 && ' & '}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Game Results */}
        {scores.size && (
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4 text-center text-white">
              Final Scores
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {Array.from(scores.values()).map(team => (
                <div key={team[0]}>
                  <div
                    className={`p-4 rounded-xl text-center ${
                      // Need to change this to check if they are the winning team
                      winners.includes(team[0])
                        ? 'bg-green-900/30 border border-green-500'
                        : 'bg-red-900/30 border border-red-500'
                    }`}
                  >
                    {/* Team Name */}
                    <div className="text-lg font-semibold text-white">
                      {team[0]}
                    </div>

                    <div
                      className={`text-2xl font-bold ${
                        //Need to change
                        winners.includes(team[0])
                          ? 'text-green-400'
                          : 'text-red-400'
                      }`}
                    >
                      {team[1]}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="p-6">
          <div className="grid grid-cols-1 gap-4 mb-6">
            {/* View Leaderboard */}
            <button
              onClick={handleViewLeaderboard}
              className="flex items-center justify-center gap-3 p-4 bg-green-600 hover:bg-green-700 rounded-xl transition font-semibold text-white sm:col-span-2"
            >
              <span className="text-xl"></span>
              View Leaderboard
            </button>

              <button
                onClick={handleViewMaterials}
                className="flex items-center justify-center gap-3 p-4 bg-[#3C2C9E] hover:bg-[#382A91] rounded-xl transition font-semibold text-white sm:col-span-2"
              >
                <span className="text-xl"></span>
                View Game Reports
              </button>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            {continueAdministering ? (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 rounded-xl transition font-semibold text-white"
              >
                Close
              </button>
            ) : (
              <button
                onClick={handleBackToDashboard}
                className="flex-1 px-4 py-3 bg-gray-600 hover:bg-gray-700 rounded-xl transition font-semibold text-white"
              >
                Back to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameEndPopup;
