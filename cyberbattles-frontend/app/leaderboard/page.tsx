'use client'

// Used Claude to generate a basic leaderboard scheme.
// https://claude.ai/chat/820c7826-c91b-47ec-9b1f-1d3b3b97f486

import Navbar from "../../components/Navbar"
import React, { useEffect, useRef, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../lib/firebase";

// Explicitly define the types for the props.
interface Team {
  id: string;
  teamName: string;
  country: string;
  points: number;
  playedMatches: number;
  countryFlag?: string; 
}

interface LeaderboardRowProps {
  team: Team;
  position: number;
  delay: number;
}

const getRankStyle = (position: any) => {
  switch(position) {
    case 1:
      return "from-yellow-400/20 to-amber-600/20 border-yellow-400/30 shadow-yellow-400/10";
    case 2:
      return "from-gray-300/20 to-gray-500/20 border-gray-300/30 shadow-gray-300/10";
    case 3:
      return "from-amber-600/20 to-orange-600/20 border-amber-600/30 shadow-amber-600/10";
    default:
      return "from-gray-800/50 to-gray-900/50 border-gray-700/30 hover:border-cyan-500/30";
  }
};

const LeaderboardRow = ({ team, position, delay }: LeaderboardRowProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`transform transition-all duration-700 ease-out ${
        isVisible ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
      }`}
    >
      <div
        className={`
        relative bg-gradient-to-r ${getRankStyle(position)}
        border rounded-xl p-6 mb-4 backdrop-blur-sm
        hover:scale-[1.02] transition-all duration-300
        shadow-lg hover:shadow-2xl
      `}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            {/* Rank */}
            <div className="flex items-center justify-center w-12 h-12 bg-black/20 rounded-full">
              <span className="text-xs font-bold text-white mt-1">
                #{position}
              </span>
            </div>

            {/* Team Info */}
            <div className="flex items-center space-x-4">
              {/* Optional flag */}
              <div className="text-2xl">{team.countryFlag || "🌍"}</div>
              <div>
                <h3 className="text-xl font-bold text-white">{team.teamName}</h3>
                <p className="text-sm text-gray-300">{team.country}</p>
              </div>
            </div>
          </div>

          {/* Points */}
          <div className="text-right">
            <div className="text-2xl font-bold text-white">
              {team.points.toLocaleString()}
            </div>
            <div className="text-sm text-gray-400">points</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function LeaderboardPage() {
  const [teams, setTeams] = useState<any[]>([]);
  const [animationStarted, setAnimationStarted] = useState(false);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const snapshot = await getDocs(collection(db, "leaderboard"));
      const data = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          teamName: d.teamName,
          country: d.country,
          points: d.totalPoints,
          playedMatches: d.playedMatches,
        };
      });

      // sort by points descending
      data.sort((a, b) => b.points - a.points);
      setTeams(data);
    };

    fetchLeaderboard();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setAnimationStarted(true), 10);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Header */}
      <section className="flex flex-col items-center justify-center pt-50 pb-12">
        <div
          className={`transform transition-all duration-1000 ease-out ${
            animationStarted
              ? "translate-y-0 opacity-100"
              : "translate-y-12 opacity-0"
          }`}
        >
          <h1 className="text-6xl font-extrabold text-white mb-4 drop-shadow-2xl bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            CyberBattles Leaderboard
          </h1>
          <p className="text-xl text-gray-300 drop-shadow-lg italic font-medium text-center max-w-2xl">
            Global leaderboard showcasing the best teams of CyberBattles.
          </p>
        </div>
      </section>

      {/* Leaderboard */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="space-y-0">
          {teams.map((team, index) => (
            <LeaderboardRow
              key={team.id}
              team={team}
              position={index + 1}
              delay={animationStarted ? index * 150 + 200 : 0}
            />
          ))}
        </div>

        {/* Stats Footer */}
        {teams.length > 0 && (
          <div
            className={`transform transition-all duration-1000 delay-1000 ease-out ${
              animationStarted
                ? "translate-y-0 opacity-100"
                : "translate-y-8 opacity-0"
            }`}
          >
            <div className="mt-12 text-center">
              <div className="inline-flex items-center space-x-8 bg-gray-800/50 backdrop-blur-sm rounded-full px-8 py-4 border border-gray-700/50">
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-400">
                    {teams.length}
                  </div>
                  <div className="text-sm text-gray-400">Teams</div>
                </div>
                <div className="w-px h-8 bg-gray-600"></div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-400">
                    {teams
                      .reduce((sum, team) => sum + team.points, 0)
                      .toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400">Total Points</div>
                </div>
                <div className="w-px h-8 bg-gray-600"></div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-400">Live</div>
                  <div className="text-sm text-gray-400">Updates</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}