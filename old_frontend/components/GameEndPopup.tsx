'use client';
import React, {useEffect, useState} from 'react';
import {db} from '@/lib/firebase';
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
  isOpen,
  onClose,
  sessionId,
  continueAdministering,
}) => {
  const router = useRouter();
  const [scores, setScores] = useState<Map<string, [string, number]>>(
    new Map(),
  );
  const [winners, setWinners] = useState<string[]>([]);

  // Populate the scores
  useEffect(() => {
    const getScores = async () => {
      if (!sessionId) return;

      try {
        const finishedRef = doc(db, 'finishedSessions', sessionId);
        const finishedSnap = await getDoc(finishedRef);

        if (finishedSnap.exists()) {
          const finishedData = finishedSnap.data();
          const results = finishedData.results;

          if (results && Object.keys(results).length > 0) {
            const scoreMap = new Map<string, [string, number]>();
            Object.keys(results).forEach(id => {
              const pair = results[id];
              const teamName = pair[0];
              const score = pair[1];
              scoreMap.set(id, [teamName, score]);
            });
            setScores(scoreMap);
          }
        }
      } catch (error) {
        console.error('Error fetching scores:', error);
      }
    };

    if (isVisible && isOpen) {
      getScores();
    }
  }, [sessionId, isVisible, isOpen]);

  // Get winners
  useEffect(() => {
    if (scores.size === 0) return;

    let currentWinners: string[] = [];
    let highScore: number | null = null;

    scores.forEach((value, _) => {
      let teamName = value[0];
      let score = value[1];
      if (highScore == null || score > highScore) {
        highScore = score;
        currentWinners = [teamName];
      } else if (score == highScore) {
        currentWinners = currentWinners.concat([teamName]);
      }
    });
    setWinners(currentWinners);
  }, [scores]);

  if (!isOpen || !isVisible) {
    return null;
  }

  const handleViewLeaderboard = () => {
    router.push('/leaderboard');
    onClose();
  };

  const handleViewMaterials = () => {
    router.push('/reports');
    onClose();
  };

  const handleBackToDashboard = () => {
    router.push('/dashboard');
    onClose();
  };

  // Logic: If we have no scores, we are still loading/calculating
  const isLoading = scores.size === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Popup Content */}
      <div
        className="relative mx-4 w-full max-w-2xl overflow-hidden rounded-2xl
          border border-gray-700 bg-[#2E2D2D] shadow-2xl"
      >
        {/* Header */}
        <div
          className="relative border-b border-gray-700 bg-[#1e1e1e] p-6
            text-center"
        >
          <div className="relative">
            <h1 className="mb-2 text-3xl font-bold text-white">
              Game Finished
            </h1>

            {!isLoading && winners.length === 1 && (
              <div className="animate-fade-in text-xl font-semibold text-blue-400">
                Winner:
                <br />{' '}
                <span className="text-2xl text-blue-300">{winners[0]}</span>
              </div>
            )}
            {!isLoading && winners.length > 1 && (
              <div className="animate-fade-in text-xl font-semibold text-blue-400">
                Tie:
                <br />{' '}
                {winners.map((winner, index) => (
                  <span key={winner} className="text-blue-300">
                    {' '}
                    {winner} {index !== winners.length - 1 && ' & '}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-6 py-16">
            <div className="relative h-16 w-16">
              <div
                className="absolute top-0 left-0 h-full w-full rounded-full
                  border-4 border-gray-600 opacity-20"
              ></div>
              <div
                className="absolute top-0 left-0 h-full w-full animate-spin
                  rounded-full border-4 border-blue-500 border-t-transparent"
              ></div>
            </div>
            <div className="text-center">
              <p className="text-2xl font-semibold text-gray-300">
                Calculating Results...
              </p>
              <p className="mt-1 text-lg text-gray-500">
                Gathering team scores
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6">
            <h3 className="mb-4 text-center text-lg font-semibold text-gray-300">
              Final Scores
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {Array.from(scores.values()).map(team => (
                <div key={team[0]}>
                  <div
                    className={`rounded-xl p-4 text-center transition-all
                      duration-300 ${
                        winners.includes(team[0])
                          ? 'border border-green-500/50 bg-green-900/20 '
                          : 'border border-red-500/30 bg-red-900/20'
                      }`}
                  >
                    <div className="mb-1 text-lg font-semibold text-gray-100">
                      {team[0]}
                    </div>

                    <div
                      className={`font-mono text-2xl font-bold ${
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
        <div className="bg-[#2E2D2D] p-6 pt-2">
          <div className="mb-6 grid grid-cols-1 gap-4">
            <button
              onClick={handleViewLeaderboard}
              disabled={isLoading}
              className={`flex cursor-pointer items-center justify-center gap-3
                rounded-xl p-4 font-semibold text-white transition sm:col-span-2
                ${
                  isLoading
                    ? 'cursor-not-allowed bg-gray-700 opacity-50'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
            >
              View Leaderboard
            </button>

            <button
              onClick={handleViewMaterials}
              disabled={isLoading}
              className={`flex cursor-pointer items-center justify-center gap-3
                rounded-xl p-4 font-semibold text-white transition sm:col-span-2
                ${
                  isLoading
                    ? 'cursor-not-allowed bg-gray-700 opacity-50'
                    : 'bg-[#3C2C9E] hover:bg-[#382A91]'
                }`}
            >
              View Game Reports
            </button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            {continueAdministering ? (
              <button
                onClick={onClose}
                className="flex-1 cursor-pointer rounded-xl border
                  border-gray-500 bg-gray-600 px-4 py-3 font-semibold text-white
                  transition hover:bg-gray-500"
              >
                Close
              </button>
            ) : (
              <button
                onClick={handleBackToDashboard}
                className="flex-1 cursor-pointer rounded-xl border
                  border-gray-500 bg-gray-600 px-4 py-3 font-semibold text-white
                  transition hover:bg-gray-500"
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
