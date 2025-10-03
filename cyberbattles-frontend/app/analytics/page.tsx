'use client';
// REF: https://claude.ai/chat/ab790ee6-b43f-4356-a5c9-d020e0a8d5bf
import React, { useEffect, useState } from 'react';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import {auth, db} from '@/lib/firebase';
import { TrendingUp, Users, Gamepad2, UserCheck, LandPlot, Sword, WifiOff, Trophy } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Analytics = () => {
    const [userClan, setUserClan] = useState<any>(null);
    const [teamId, setteamId] = useState<any>(null);
    const [clanLoading, setClanLoading] = useState(true);
    const [stats, setStats] = useState({
        totalUsers: 0,
        gamesPlayed: 50,
        activeGames: 0,
        activePlayers: 0,
        totalClans: 0,
        totalFlags: 1540,
        totalChallenges: 124,
        totalDowntime: 230.35,
  });

  const [clanStats, setClanStats] = useState([
    { date: 'Game 1', wins: 0, losses: 0 },
    { date: 'Game 2', wins: 0, losses: 0 },
    { date: 'Game 3', wins: 0, losses: 0 },
    { date: 'Game 4', wins: 0, losses: 0 },
    { date: 'Game 5', wins: 0, losses: 0 },
    { date: 'Game 6', wins: 0, losses: 0 },
    { date: 'Game 7', wins: 0, losses: 0 },
  ]);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setUserClan(null);
        setteamId(null);
        setClanLoading(false);
        return;
      }
  
      setClanLoading(true);
  
      try {
        const teamsRef = collection(db, "clans");
        const q = query(teamsRef, where("memberIds", "array-contains", user.uid));
        const querySnapshot = await getDocs(q);
  
        if (!querySnapshot.empty) {
          const clanDoc = querySnapshot.docs[0];
          const clanData = clanDoc.data();
  
          setUserClan({
            id: clanDoc.id,
            ...clanData,
          });
  
          if (clanData.teamId) {
            setteamId(clanData.teamId);
          } else {
            setteamId(null);
          }
        } else {
          setUserClan(null);
          setteamId(null);
        }
      } catch (error) {
        console.error("Error checking user clan:", error);
        setUserClan(null);
        setteamId(null);
      } finally {
        setClanLoading(false);
      }
    });
  
    return () => unsubscribe();
  }, []);


  useEffect(() => {
    const fetchTotalUsers = async () => {
      try {
        const loginSnapshot = await getDocs(collection(db, 'login'));
        const userCount = loginSnapshot.size;
        setStats(prev => ({ ...prev, totalUsers: userCount }));
      } catch (err) {
        console.error('Error fetching total users:', err);
      }
    };

    fetchTotalUsers();
  }, []);

  useEffect(() => {
    const fetchCurrentGames = async () => {
      try {
        const sessionSnapshot = await getDocs(collection(db, 'sessions'));
        const activeCount = sessionSnapshot.size;
        const activePlayers = activeCount * 10
        setStats(prev => ({ ...prev, activeGames: activeCount }));
        setStats(prev => ({ ...prev, activePlayers: activePlayers }));
      } catch (err) {
        console.error('Error fetching total users:', err);
      }
    };

    fetchCurrentGames();
  }, []);

  useEffect(() => {
    const fetchTotalUsers = async () => {
      try {
        const loginSnapshot = await getDocs(collection(db, 'clans'));
        const clanCount = loginSnapshot.size;
        setStats(prev => ({ ...prev, totalClans: clanCount }));
      } catch (err) {
        console.error('Error fetching total users:', err);
      }
    };

    fetchTotalUsers();
  }, []);

  useEffect(() => {
    if (!teamId) return;
    const fetchGameResults = async () => {
      try {
        const leaderboardRef = doc(db, "leaderboard", teamId);
        const leaderboardSnap = await getDoc(leaderboardRef);
  
        if (leaderboardSnap.exists()) {
          const data = leaderboardSnap.data();
          const results = data.gameResult || [];
  
          const lastSeven = results.slice(-7);
  
          const formatted = lastSeven.map((result: string, idx: number) => ({
            date: `${idx + 1}`,
            performance: result === "Win" ? 1 : 0,
          }));
  
          while (formatted.length < 7) {
            formatted.unshift({
              date: `${7 - formatted.length}`,
              performance: 0,
            });
          }
  
          setClanStats(formatted);
        } else {
          console.log("No such document!");
        }
      } catch (err) {
        console.error("Error fetching game results:", err);
      }
    };
  
    fetchGameResults();
  }, [teamId]);
  


  return (
    <div className="min-h-screen pt-50 px-6 pb-12 bg-[#2f2f2f] text-white">
      <div className="max-w-7xl mx-auto">


        {/* Dashboard Widgets */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Users */}
          <div className="p-6 bg-[#1e1e1e] rounded-2xl shadow-lg border border-gray-800 hover:border-blue-500 transition-all duration-300 hover:shadow-blue-500/20">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <h2 className="text-sm font-medium text-gray-400 mb-1">Total Users</h2>
            <p className="text-3xl font-bold text-white">{stats.totalUsers.toLocaleString()}</p>
          </div>

          {/* Games Played */}
          <div className="p-6 bg-[#1e1e1e] rounded-2xl shadow-lg border border-gray-800 hover:border-purple-500 transition-all duration-300 hover:shadow-purple-500/20">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/10 rounded-xl">
                <Gamepad2 className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <h2 className="text-sm font-medium text-gray-400 mb-1">Games Played</h2>
            <p className="text-3xl font-bold text-white">{stats.gamesPlayed.toLocaleString()}</p>
          </div>

          {/* Active Games */}
          <div className="p-6 bg-[#1e1e1e] rounded-2xl shadow-lg border border-gray-800 hover:border-green-500 transition-all duration-300 hover:shadow-green-500/20">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <Gamepad2 className="w-6 h-6 text-green-400" />
              </div>
            </div>
            <h2 className="text-sm font-medium text-gray-400 mb-1">Active Games</h2>
            <p className="text-3xl font-bold text-white">{stats.activeGames}</p>
          </div>

          {/* Active Players */}
          <div className="p-6 bg-[#1e1e1e] rounded-2xl shadow-lg border border-gray-800 hover:border-yellow-500 transition-all duration-300 hover:shadow-yellow-500/20">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-500/10 rounded-xl">
                <UserCheck className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
            <h2 className="text-sm font-medium text-gray-400 mb-1">Active Players</h2>
            <p className="text-3xl font-bold text-white">{stats.activePlayers}</p>
          </div>

          {/* Total Clans*/}
          <div className="p-6 bg-[#1e1e1e] rounded-2xl shadow-lg border border-gray-800 hover:border-blue-500 transition-all duration-300 hover:shadow-blue-500/20">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Users className="w-6 h-6 text-blue-400" />
              </div>
            </div>
            <h2 className="text-sm font-medium text-gray-400 mb-1">Total Clans</h2>
            <p className="text-3xl font-bold text-white">{stats.totalClans}</p>
          </div>
          {/* Flags Solved*/}
          <div className="p-6 bg-[#1e1e1e] rounded-2xl shadow-lg border border-gray-800 hover:border-purple-500 transition-all duration-300 hover:shadow-purple-500/20">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-purple-500/10 rounded-xl">
                <LandPlot className="w-6 h-6 text-purple-400" />
              </div>
            </div>
            <h2 className="text-sm font-medium text-gray-400 mb-1">Flags Solved</h2>
            <p className="text-3xl font-bold text-white">{stats.totalFlags.toLocaleString()}</p>
          </div>
           {/* Challenges Created*/}
           <div className="p-6 bg-[#1e1e1e] rounded-2xl shadow-lg border border-gray-800 hover:border-green-500 transition-all duration-300 hover:shadow-green-500/20">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-500/10 rounded-xl">
                <Sword className="w-6 h-6 text-green-400" />
              </div>
            </div>
            <h2 className="text-sm font-medium text-gray-400 mb-1">Challenged Created</h2>
            <p className="text-3xl font-bold text-white">{stats.totalChallenges.toLocaleString()}</p>
          </div>
          {/* Game downtime*/}
          <div className="p-6 bg-[#1e1e1e] rounded-2xl shadow-lg border border-gray-800 hover:border-yellow-500 transition-all duration-300 hover:shadow-yellow-500/20">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-yellow-500/10 rounded-xl">
                <WifiOff className="w-6 h-6 text-yellow-400" />
              </div>
            </div>
            <h2 className="text-sm font-medium text-gray-400 mb-1">Ingame Downtime</h2>
            <p className="text-3xl font-bold text-white">{(stats.totalDowntime + "sec").toLocaleString()}</p>
          </div>
          </div>
           {/* Clan Performance Graph */}
        <div className="mt-8 p-6 bg-[#1e1e1e] rounded-2xl shadow-lg border border-gray-800">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-gradient-to-br from-green-500/20 to-red-500/20 rounded-lg">
              <Trophy className="w-5 h-5 text-yellow-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Clan Performance Last Seven Games</h2>
              <p className="text-sm text-gray-400">Wins vs Losses Tracker</p>
            </div>
          </div>
          
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={clanStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                dataKey="date" 
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
                />
                <YAxis 
                stroke="#9CA3AF"
                style={{ fontSize: '12px' }}
                domain={[0, 1]} 
                ticks={[0, 1]}
                tickFormatter={(val) => (val === 1 ? "Win" : "Loss")}
                />
                <Tooltip
                formatter={(value) => (value === 1 ? "Win" : "Loss")}
                labelFormatter={(label) => `Game ${label}`}
                contentStyle={{
                    backgroundColor: '#1e1e1e',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#fff'
                }}
                />
                <Line
                type="monotone"
                dataKey="performance"
                stroke="#facc15"
                strokeWidth={3}
                dot={{ fill: '#facc15', r: 5 }}
                activeDot={{ r: 7 }}
                name="Performance"
                />
            </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
  );
};

export default Analytics;