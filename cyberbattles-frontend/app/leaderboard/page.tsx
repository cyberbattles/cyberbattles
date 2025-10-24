'use client';

import React, {useEffect, useState} from 'react';
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  limit,
  getDocs,
  Unsubscribe,
} from 'firebase/firestore';
import {db} from '@/lib/firebase';
import {useAuth} from '@/components/Auth';

interface Clan {
  id: string;
  clanTag: string;
  totalScore: number;
}

interface GameTeam {
  id: string;
  name: string;
  totalScore: number;
  totalCount: number;
  downCount: number;
}

interface LeaderboardRowProps {
  item: Clan | GameTeam;
  position: number;
  delay: number;
}

const getRankStyle = (position: number) => {
  switch (position) {
    case 1:
      return 'from-yellow-400/20 to-amber-600/20 border-yellow-400/30 ';
    case 2:
      return 'from-gray-300/20 to-gray-500/20 border-gray-300/30 ';
    case 3:
      return 'from-amber-600/20 to-orange-600/20 border-amber-600/30 ';
    default:
      return 'from-gray-800/50 to-gray-900/50 border-gray-700/30 hover:border-cyan-500/30';
  }
};

const LeaderboardRow = ({item, position, delay}: LeaderboardRowProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={`transform transition-all duration-700 ease-out ${
        isVisible ? 'translate-y-0 opacity-100' : 'translate-y-8 opacity-0'
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
            <div className="flex items-center justify-center w-12 h-12 bg-black/20 rounded-full flex-shrink-0">
              <span className="text-xs font-bold text-white mt-1">
                #{position}
              </span>
            </div>

            {/* Name */}
            <div>
              <h3
                className="text-xl font-bold text-white truncate"
                title={
                  item instanceof Object && 'clanTag' in item
                    ? item.clanTag
                    : item.name
                }
              >
                {item instanceof Object && 'clanTag' in item
                  ? item.clanTag
                  : item.name}
              </h3>
            </div>
          </div>

          {/* Points */}
          <div className="text-right ml-4 flex-shrink-0">
            <div className="text-2xl font-bold text-white">
              {item.totalScore?.toLocaleString() ?? 0}
            </div>
            <div className="text-sm text-gray-400">points</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function LeaderboardPage() {
  const {currentUser} = useAuth();
  const [clans, setClans] = useState<Clan[]>([]);
  const [gameTeams, setGameTeams] = useState<GameTeam[]>([]);
  const [isInSession, setIsInSession] = useState<boolean>(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'clan' | 'game'>('clan'); // Default to clan
  const [animationStarted, setAnimationStarted] = useState(false);
  const [loading, setLoading] = useState(true); // Added loading state

  useEffect(() => {
    const timer = setTimeout(() => setAnimationStarted(true), 10);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!currentUser?.uid) {
      setIsInSession(false);
      setActiveSessionId(null);
      setViewMode('clan');
      setLoading(false);
      return;
    }

    setLoading(true);
    let active = true;

    const checkSession = async () => {
      const sessionsRef = collection(db, 'sessions');
      const queryMember = query(
        sessionsRef,
        where('memberIds', 'array-contains', currentUser.uid),
        limit(1),
      );
      const queryAdmin = query(
        sessionsRef,
        where('id', '==', localStorage.getItem('sessionId')),
        limit(1),
      );

      try {
        const memberSessionSnapshot = await getDocs(queryMember);
        const adminSessionSnapshot = await getDocs(queryAdmin);
        if (!active) return;

        if (!memberSessionSnapshot.empty) {
          const sessionDoc = memberSessionSnapshot.docs[0];
          setIsInSession(true);
          setActiveSessionId(sessionDoc.id);
          setViewMode('game');
        } else if (!adminSessionSnapshot.empty) {
          const sessionDoc = adminSessionSnapshot.docs[0];
          setIsInSession(true);
          setActiveSessionId(sessionDoc.id);
          setViewMode('game');
        } else {
          setIsInSession(false);
          setActiveSessionId(null);
          setViewMode('clan');
        }
      } catch (error) {
        console.error("Error checking user's session:", error);
        if (active) {
          setIsInSession(false);
          setActiveSessionId(null);
          setViewMode('clan');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    checkSession();

    return () => {
      active = false;
    };
  }, [currentUser]);

  useEffect(() => {
    const clansRef = collection(db, 'clans');
    const q = query(clansRef, orderBy('totalScore', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      querySnapshot => {
        const clansData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          clanTag: doc.data().name || doc.data().clanTag || `Clan ${doc.id}`, // Use 'name' or fallback to 'clanTag' or ID
          totalScore: doc.data().totalScore || 0,
        }));
        setClans(clansData);
        if (!currentUser?.uid) setLoading(false);
      },
      error => {
        console.error('Error fetching clan leaderboard:', error);
        if (!currentUser?.uid) setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    let unsubscribe: Unsubscribe = () => {};

    if (isInSession && activeSessionId) {
      const teamsRef = collection(db, 'teams');
      const q = query(teamsRef, where('sessionId', '==', activeSessionId));

      unsubscribe = onSnapshot(
        q,
        querySnapshot => {
          const teamsData = querySnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name || `Team ${doc.id}`,
            totalScore: doc.data().totalScore || 0,
            totalCount: doc.data().totalCount || 0,
            downCount: doc.data().downCount || 0,
          }));
          setGameTeams(teamsData);
        },
        error => {
          console.error('Error fetching game leaderboard:', error);
        },
      );
    } else {
      setGameTeams([]);
    }

    return () => {
      console.log('Cleaning up game teams listener.');
      unsubscribe();
    };
  }, [isInSession, activeSessionId]);

  const currentLeaderboardData = viewMode === 'clan' ? clans : gameTeams;
  const isClanView = viewMode === 'clan';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-white text-xl">Loading Leaderboard...</p>
        <div
          className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
          role="status"
        >
          <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
            Loading...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="flex flex-col items-center justify-center pt-50 pb-12">
        <div
          className={`transform transition-all duration-1000 ease-out ${
            animationStarted
              ? 'translate-y-0 opacity-100'
              : 'translate-y-12 opacity-0'
          }`}
        >
          <h1 className="text-6xl font-extrabold text-white mb-4 drop-shadow-2xl bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-center">
            CyberBattles Leaderboard
          </h1>
        </div>
      </section>

      {/* Toggle Section */}
      <section className="max-w-4xl mx-auto px-6 mb-8 -mt-10">
        <div className="flex justify-center">
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-full">
            <div className="flex">
              <button
                onClick={() => setViewMode('clan')}
                className={`px-6 py-3 rounded-full transition-all duration-300 font-bold ${
                  viewMode === 'clan'
                    ? 'bg-blue-500 text-white '
                    : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                Clan Leaderboard
              </button>
              {isInSession && (
                <button
                  onClick={() => setViewMode('game')}
                  className={`px-6 py-3 rounded-full transition-all duration-300 font-bold ${
                    viewMode === 'game'
                      ? 'bg-blue-500 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-gray-700/50'
                  }`}
                >
                  Game Leaderboard
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Leaderboard */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="space-y-0">
          {currentLeaderboardData.length > 0 ? (
            currentLeaderboardData.map((item, index) => (
              <LeaderboardRow
                key={item.id}
                item={item}
                position={index + 1}
                delay={animationStarted ? index * 150 + 200 : 0}
              />
            ))
          ) : (
            <p className="text-center text-gray-400 mt-8">
              {isClanView
                ? 'No clans found.'
                : 'No teams found in this game session yet.'}
            </p>
          )}
        </div>

        {/* Stats Footer */}
        {currentLeaderboardData.length > 0 && (
          <div
            className={`transform transition-all duration-1000 delay-1000 ease-out ${
              animationStarted
                ? 'translate-y-0 opacity-100'
                : 'translate-y-8 opacity-0'
            }`}
          >
            <div className="mt-12 text-center">
              <div className="inline-flex items-center space-x-8 bg-gray-800/50 backdrop-blur-sm rounded-full px-8 py-4 border border-gray-700/50">
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-400">
                    {currentLeaderboardData.length}
                  </div>
                  <div className="text-sm text-gray-400">
                    {isClanView ? 'Clans' : 'Teams in Game'}
                  </div>
                </div>
                <div className="w-px h-8 bg-gray-600"></div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-cyan-400">
                    {currentLeaderboardData
                      .reduce((sum, item) => sum + (item.totalScore || 0), 0)
                      .toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-400">Total Points</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
