'use client';
import React, {useState, useEffect, useCallback} from 'react';
import {auth, db} from '@/lib/firebase';
import {signOut} from 'firebase/auth';
import {
  collection,
  query,
  where,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  updateDoc,
  arrayRemove,
} from 'firebase/firestore';
import {useRouter} from 'next/navigation';
import {FaRegCopy} from 'react-icons/fa';
import QRCode from 'react-qr-code';
import {useAuth} from '@/components/Auth';
import FlagPopup from '@/components/FlagPopup';

interface TeamData {
  id: string;
  name: string;
  memberIds: string[];
  sessionId: string;
  ipAddress: string;
  totalScore: number;
  downCount: number;
  totalCount: number;
}

interface SessionTeamInfo {
  id: string;
  name: string;
  ipAddress: string;
}

interface NetworkLocationsProps {
  teams: SessionTeamInfo[];
  port: number | string | undefined;
  handleCopy: (text: string) => void;
}

const NetworkLocations: React.FC<NetworkLocationsProps> = React.memo(
  ({teams, port, handleCopy}) => {
    // Show a placeholder if data is missing
    if (!port || teams.length === 0) {
      return (
        <div className="p-6 bg-[#1e1e1e] rounded-2xl shadow-md col-span-1 lg:col-span-3">
          <h2 className="text-xl font-semibold mb-4 text-gray-400">
            Network Locations
          </h2>
          <p className="text-gray-500">
            Network locations will be shown here once the game is active.
          </p>
        </div>
      );
    }

    return (
      <div className="p-6 bg-[#1e1e1e] rounded-2xl shadow-md col-span-1 lg:col-span-3">
        <h2 className="text-xl font-semibold mb-6 text-gray-100">
          Network Locations
        </h2>
        <div className="flex flex-wrap gap-4">
          {teams.map(team => {
            const url = `http://${team.ipAddress}:${port}`;
            return (
              <div
                key={team.id}
                className="flex-grow p-4 bg-[#2a2a2a] rounded-xl border border-gray-700 min-w-[240px]"
              >
                {/* Team Name */}
                <p className="text-sm text-gray-400 mb-1">{team.name}</p>
                <div className="flex items-center justify-between gap-4">
                  {/* Hyperlink */}
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-lg font-mono font-bold text-blue-400 truncate hover:text-blue-300 hover:underline"
                    title={`Open ${url} in new tab`}
                  >
                    {url}
                  </a>
                  {/* Copy Button */}
                  <button
                    onClick={() => handleCopy(url)}
                    className="flex-shrink-0 h-9 w-9 p-2.5 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 transition-colors duration-200"
                    title="Copy URL"
                  >
                    <FaRegCopy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);

const Lobby = () => {
  const router = useRouter();
  const {currentUser} = useAuth();
  const [players, setPlayers] = useState(new Map());
  const [currentScenario, setCurrentScenario] = useState<any | null>(null);
  const [gameStatus, setGameStatus] = useState(''); // waiting, starting, active
  const [team, setTeam] = useState<TeamData | null>(null);
  const [isKicked, setIsKicked] = useState(false);
  const [gameTeamId, setGameTeamId] = useState<string>('');
  const [gameSessionId, setSessionId] = useState<string>('');
  const [currentUsername, setcurrentUsername] = useState('User');
  const [vpnConfig, setVpnConfig] = useState<string | null>(null);
  const [gameteamIp, setgameteamIp] = useState<any>(null);
  const [sessionTeams, setSessionTeams] = useState<SessionTeamInfo[]>([]);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [uptimePercentage, setUptimePercentage] = useState<number>(100);
  const [showVpn, setShowVpn] = useState(false);

  useEffect(() => {
    const updateUsername = async () => {
      if (currentUser) {
        try {
          const q = query(
            collection(db, 'login'),
            where('UID', '==', currentUser.uid),
          );
          const querySnap = await getDocs(q);

          if (!querySnap.empty) {
            const userDoc = querySnap.docs[0];
            const userData = userDoc.data();
            setcurrentUsername(userData.userName);
          }
        } catch (error) {
          console.error('Error fetching username:', error);
        }
      }
    };
    updateUsername();
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    // Listen for the user's team
    const teamsQuery = query(
      collection(db, 'teams'),
      where('memberIds', 'array-contains', currentUser.uid),
    );

    const unsubscribeTeams = onSnapshot(teamsQuery, querySnapshot => {
      if (!querySnapshot.empty) {
        const teamDoc = querySnapshot.docs[0];
        setGameTeamId(teamDoc.id);
        setTeam({id: teamDoc.id, ...teamDoc.data()} as TeamData);
        console.log("User's team updated:", teamDoc.id);
      } else {
        console.log('User is not currently in a team.');
        setGameTeamId('');
        setTeam(null);
        // If user is not in a team, they shouldn't be in the lobby
        router.push('/dashboard');
      }
    });

    return () => unsubscribeTeams();
  }, [currentUser, router]);

  useEffect(() => {
    if (!gameTeamId) return;

    // Listen for the session ID based on the team ID
    const sessionQuery = query(
      collection(db, 'sessions'),
      where('teamIds', 'array-contains', gameTeamId),
    );

    const unsubscribeSessions = onSnapshot(sessionQuery, querySnapshot => {
      if (!querySnapshot.empty) {
        const sessionDoc = querySnapshot.docs[0];
        setSessionId(sessionDoc.id);
        console.log("User's session updated:", sessionDoc.id);
      } else {
        console.log('Team is not currently in a session.');
        setSessionId('');
      }
    });

    return () => unsubscribeSessions();
  }, [gameTeamId]);

  useEffect(() => {
    const fetchIps = async () => {
      if (!currentUser || !gameTeamId || !gameSessionId) {
        setgameteamIp(null);
        return;
      }
      const teamRef = doc(db, 'teams', gameTeamId);
      const teamSnap = await getDoc(teamRef);
      if (teamSnap.exists()) {
        setgameteamIp(teamSnap.data().ipAddress ?? null);
      }
    };

    fetchIps();
  }, [currentUser, gameTeamId, gameSessionId]);

  useEffect(() => {
    if (!gameSessionId) {
      setSessionTeams([]);
      return;
    }

    const fetchSessionTeams = async () => {
      try {
        const sessionRef = doc(db, 'sessions', gameSessionId);
        const sessionSnap = await getDoc(sessionRef);

        if (!sessionSnap.exists()) {
          console.warn('Session doc not found!');
          return;
        }

        const teamIds = sessionSnap.data().teamIds as string[] | undefined;
        if (!teamIds || teamIds.length === 0) {
          setSessionTeams([]);
          return;
        }

        const teamPromises = teamIds.map(async teamId => {
          const teamRef = doc(db, 'teams', teamId);
          const teamSnap = await getDoc(teamRef);
          if (teamSnap.exists()) {
            const data = teamSnap.data();
            return {
              id: teamSnap.id,
              name: data.name || 'Unnamed Team',
              ipAddress: data.ipAddress || '0.0.0.0',
            };
          }
          return null;
        });

        const teamsData = (await Promise.all(teamPromises)).filter(
          team => team !== null,
        ) as SessionTeamInfo[];

        setSessionTeams(teamsData);
      } catch (error) {
        console.error('Error fetching session teams:', error);
      }
    };

    fetchSessionTeams();
  }, [gameSessionId]);

  // Get the current scenario information
  useEffect(() => {
    async function getScenario() {
      if (!team || !team.sessionId) return;

      try {
        const sessionRef = doc(db, 'sessions', team.sessionId);
        const sessionSnap = await getDoc(sessionRef);
        let scenarioId = '';
        if (sessionSnap.exists()) {
          scenarioId = sessionSnap.data().scenarioId;
          if (sessionSnap.data().started) {
            setGameStatus('started');
          } else {
            setGameStatus('waiting');
          }
        }

        const scenearioRef = doc(db, 'scenarios', scenarioId);
        const scenarioSnap = await getDoc(scenearioRef);
        if (scenarioSnap.exists()) {
          setCurrentScenario(scenarioSnap.data());
        }
      } catch (error) {
        console.log('Failed to get scenario:', error);
      }
    }
    getScenario();
  }, [team]);

  async function getUser(uid: any) {
    if (!uid) return null;
    try {
      const docRef = doc(db, 'login', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data();
      }
    } catch (error) {
      console.log('Failed to get user:', error);
    }
    return null;
  }

  useEffect(() => {
    async function getPlayers() {
      if (!team || !team.memberIds) {
        setPlayers(new Map());
        return;
      }

      const newPlayers = new Map();
      for (const memberId of team.memberIds) {
        const userDoc = await getUser(memberId);
        if (userDoc) {
          newPlayers.set(memberId, userDoc);
        }
      }
      setPlayers(newPlayers);
    }
    getPlayers();
  }, [team]);

  useEffect(() => {
    async function checkAdmin() {
      if (!team || !currentUser) return;
      const sessionId = team.sessionId;
      const docRef = doc(db, 'sessions', sessionId);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        if (docSnap.data().adminId === currentUser.uid) {
          router.push('/admin');
        }
      }
    }
    checkAdmin();
  }, [currentUser, team, router]);

  // Listen for game start
  useEffect(() => {
    if (!team || !team.sessionId || gameStatus === 'started') return;

    const unsubscribe = onSnapshot(doc(db, 'sessions', team.sessionId), doc => {
      if (doc.exists() && doc.data().started) {
        console.log('Session has started');
        handleStartGame();
      }
    });
    return () => unsubscribe();
  }, [team, gameStatus]);

  // Listen for game end
  useEffect(() => {
    const sessionId = localStorage.getItem('sessionId')
    if (!sessionId) {
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'finishedSessions', sessionId), doc => {
      if (doc.exists()) {
        console.log('session has finished');
        handleEndGame();
      }
    });
    return () => unsubscribe();
  }, [team]);

  // Listen for being kicked
  useEffect(() => {
    if (!team || !gameTeamId || !currentUser || gameStatus === 'ended') return;

    const unsubscribe = onSnapshot(doc(db, 'teams', gameTeamId), doc => {
      if (doc.exists()) {
        const memberIds: string[] = doc.data().memberIds || [];
        // Refresh team object in state
        setTeam({id: doc.id, ...doc.data()} as TeamData);
        // Check if current user is still in the team
        if (!memberIds.includes(currentUser.uid)) {
          console.log('User kicked from team.');
          handleKicked();
        }
      }
    });
    return () => unsubscribe();
  }, [team, gameTeamId, currentUser]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const scoreQuery = query(
      collection(db, 'teams'),
      where('memberIds', 'array-contains', currentUser.uid),
    );

    const unsubscribeScore = onSnapshot(scoreQuery, querySnapshot => {
      if (!querySnapshot.empty) {
        if (querySnapshot.docs[0].data().totalScore !== totalScore) {
          const newTotalScore = querySnapshot.docs[0].data().totalScore;
          const newDownCount = querySnapshot.docs[0].data().downCount;
          const newTotalCount = querySnapshot.docs[0].data().totalCount;

          const newUptimePercentage =
            newTotalCount > 0 ? (1 - newDownCount / newTotalCount) * 100 : 100;
          const calculatedTotalScore =
            newTotalScore * (newUptimePercentage / 100);
          setTotalScore(calculatedTotalScore);
          setUptimePercentage(newUptimePercentage);
        }
      }
    });

    return () => unsubscribeScore();
  }, [currentUser]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handlePushShell = () => router.push('/shell');
  const handlePushTraffic = () => router.push('/network-traffic');

  const removeFromTeam = async () => {
    if (!currentUser || !gameTeamId) return;
    try {
      const teamRef = doc(db, 'teams', gameTeamId);
      await updateDoc(teamRef, {
        memberIds: arrayRemove(currentUser.uid),
      });
      console.log('Successfully removed from team:', gameTeamId);
    } catch (error) {
      console.error('Error removing from team:', error);
    }
  };

  const handleLeaveLobby = () => {
    removeFromTeam();
    router.push('/dashboard');
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const handleKicked = async () => {
    setIsKicked(true);
    await delay(3000);
    if (router) {
      router.push('/dashboard');
    }
  };

  const handleStartGame = async () => {
    setGameStatus('started');
  };

  const handleEndGame = async () => {
    setGameStatus('ended');
    const sessionId = localStorage.getItem('sessionId');
    if (router) {
      router.push('/dashboard?sessionId=' + sessionId);
    }
  };

  const handleCopy = useCallback(async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  }, []);

  const handleDownloadConfig = async () => {
    if (!currentUser || !vpnConfig) {
      return;
    }
    try {
      // Create a Blob so the browser can download it
      const blob = new Blob([vpnConfig], {type: 'text/plain'});
      const blobUrl = window.URL.createObjectURL(blob);

      // Create a hidden <a> element to trigger the download
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${currentUsername || 'vpn-config'}.conf`;
      document.body.appendChild(a);
      a.click();

      // Cleanup
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading config:', error);
    }
  };

  useEffect(() => {
    const fetchVpnConfig = async () => {
      if (!currentUser) {
        return;
      }
      if (!gameSessionId || !gameTeamId || !currentUser.uid) {
        return;
      }

      try {
        const token = await currentUser.getIdToken();
        const url = `https://cyberbattl.es/api/config/${gameSessionId}/${gameTeamId}/${currentUser.uid}/${token}`;
        const response = await fetch(url);

        if (!response.ok) {
          console.error(`Failed to fetch config file: ${response.status}`);
          return;
        }

        const data = await response.json();
        setVpnConfig(data.config);
      } catch (error) {
        console.error('Error fetching VPN config:', error);
      }
    };

    fetchVpnConfig();
  }, [currentUser, gameSessionId, gameTeamId]);

  return (
    <>
      {/* Lobby Layout */}
      <div className="flex flex-col md:flex-row min-h-screen pt-20 sm:pt-40 bg-[#2f2f2f] text-white">
        {/* Sidebar */}
        <aside className="w-full md:w-72 bg-[#1e1e1e] shadow-2xl flex-shrink-0 border-r border-gray-800">
          <nav className="p-6 sticky top-40">
            <ul className="space-y-4">
              {/* Team Name */}
              <li>
                <div className="text-sm text-gray-400">Team Name:</div>
                <div className="font-semibold text-blue-400 text-lg break-words">
                  {team?.name || '—'}
                </div>
              </li>
              {/* Team ID */}
              <li>
                <div className="text-sm text-gray-400">Team ID:</div>
                <div className="font-mono text-gray-300 break-all">
                  {gameTeamId || '—'}
                </div>
              </li>
              {/* Team Size */}
              <li>
                <div className="text-sm text-gray-400">Team Size:</div>
                <div className="font-semibold text-white">{players.size}</div>
              </li>
              {/* Game Status */}
              <li>
                <div className="text-sm text-gray-400">Game Status:</div>
                <div
                  className={`font-semibold capitalize ${
                    gameStatus === 'waiting'
                      ? 'text-yellow-400'
                      : gameStatus === 'starting'
                        ? 'text-blue-400'
                        : gameStatus === 'ended'
                          ? 'text-red-400'
                          : 'text-green-400'
                  }`}
                >
                  {gameStatus === 'starting' ? 'Starting...' : gameStatus}
                </div>
              </li>
              {/* Team IP */}
              <li>
                <div className="text-sm text-gray-400">Your IP:</div>
                <div className="font-mono text-blue-400 break-all">
                  {gameteamIp || 'N/A'}
                </div>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {/* Header */}
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h1 className="text-3xl font-bold">Session Lobby</h1>
            <div className="flex gap-4">
              <button
                className="px-5 py-2.5 bg-gray-700 rounded-xl hover:bg-gray-600 transition font-bold "
                onClick={handleLeaveLobby}
              >
                Leave Lobby
              </button>
              <button
                className="px-5 py-2.5 bg-blue-600 rounded-xl hover:bg-blue-500 transition font-bold "
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </header>

          {/* Kicked Message */}
          {isKicked && (
            <div className="my-4 p-4 bg-red-900/30 border border-red-500 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="animate-spin h-5 w-5 border-2 border-red-400 border-t-transparent rounded-full"></div>
                <span className="text-red-400 font-semibold">
                  You have been kicked... Redirecting to dashboard.
                </span>
              </div>
            </div>
          )}

          {/* New Stats Cards */}
          <section className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            {/* Total Score Card */}
            <div className="p-6 bg-[#1e1e1e] rounded-2xl shadow-md">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">
                Total Score
              </h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-blue-400">
                  {totalScore.toLocaleString()}
                </span>
                <span className="text-gray-300">points</span>
              </div>
            </div>
            {/* Uptime Card */}
            <div className="p-6 bg-[#1e1e1e] rounded-2xl shadow-md">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-2">
                Service Uptime
              </h3>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-green-400">
                  {uptimePercentage.toFixed(2)}%
                </span>
              </div>
            </div>
          </section>

          {/* Main Grid Content */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Current Scenario */}
            <div className="flex flex-col p-6 gap-5 bg-[#1e1e1e] rounded-2xl shadow-md lg:col-span-3">
              <h2 className="text-xl font-semibold pb-3 border-b border-gray-700 text-gray-100">
                Current Scenario
              </h2>
              {currentScenario ? (
                <div className="flex flex-col gap-3 text-gray-300">
                  <p className="text-2xl font-bold text-white">
                    {currentScenario.scenario_title}
                  </p>
                  <p>{currentScenario.scenario_description}</p>
                  <div className="flex gap-4 font-semibold mt-2">
                    <span className="text-gray-400">Difficulty:</span>
                    <span>{currentScenario.scenario_difficulty}</span>
                  </div>
                </div>
              ) : (
                <p className="text-gray-500">Loading scenario details...</p>
              )}
              {gameStatus === 'starting' && (
                <div className="mt-4 p-3 bg-blue-900/30 border border-blue-500 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                    <span className="text-blue-400 font-semibold">
                      Game starting...
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Team Members List */}
            <div className="flex flex-col p-6 gap-4 bg-[#1e1e1e] rounded-2xl shadow-md lg:col-span-2">
              <h2 className="text-2xl font-semibold text-green-400">
                {team?.name || 'Team'} Members
              </h2>
              <div className="flex flex-col gap-3">
                {players.size > 0 ? (
                  Array.from(players.values()).map(player => (
                    <div
                      className="flex items-center justify-between p-3 bg-[#2f2f2f] rounded-lg"
                      key={player.UID}
                    >
                      <div className="font-medium">{player.userName}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500">Loading team members...</p>
                )}
              </div>
            </div>

            {/* New Actions Card */}
            <div className="flex flex-col p-6 gap-4 bg-[#1e1e1e] rounded-2xl shadow-md lg:col-span-1">
              <h2 className="text-xl font-semibold text-gray-100 mb-2">
                Actions
              </h2>
              {/* Shell Button */}
              <button
                className="w-full px-4 py-3 bg-gray-700 rounded-xl hover:bg-gray-600 transition font-bold"
                onClick={handlePushShell}
              >
                Go to Shell
              </button>
              {/* Traffic Button */}
              <button
                className="w-full px-4 py-3 bg-gray-700 rounded-xl hover:bg-gray-600 transition font-bold"
                onClick={handlePushTraffic}
              >
                View Network Traffic
              </button>

              <div className="border-t border-gray-700 my-2"></div>

              {/* Show VPN Button */}
              <button
                className="w-full px-4 py-3 bg-blue-600 rounded-xl hover:bg-blue-500 transition font-bold "
                onClick={() => setShowVpn(true)}
              >
                VPN Setup Guide
              </button>
              {/* Download VPN Button */}
              <button
                className="w-full px-4 py-3 bg-green-600 rounded-xl hover:bg-green-500 transition font-bold "
                onClick={handleDownloadConfig}
              >
                Download VPN Config
              </button>
            </div>

            <NetworkLocations
              teams={sessionTeams}
              port={currentScenario?.port}
              handleCopy={handleCopy}
            />
          </section>
        </main>
      </div>

      {/* VPN Modal */}
      {showVpn && vpnConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e1e1e] text-white p-6 rounded-2xl w-full max-w-4xl relative flex flex-col gap-6 max-h-[90vh] shadow-2xl border border-gray-700">
            <h2 className="text-2xl font-bold text-center">
              VPN Configuration
            </h2>

            {/* Top section: textarea + QR code */}
            <div className="flex flex-col md:flex-row gap-6 overflow-y-auto">
              <textarea
                readOnly
                value={vpnConfig}
                className="flex-1 p-2 bg-[#2f2f2f] border border-gray-700 rounded-md font-mono text-sm text-gray-300 focus:outline-none"
                rows={16}
              />

              <div className="flex flex-col items-center gap-4">
                <div className="bg-white p-4 rounded-md">
                  <QRCode value={vpnConfig} size={200} />
                </div>
                <div className="font-mono text-xs text-green-300 bg-[#2f2f2f] p-3 rounded-md w-3/4">
                  <p># Install wireguard if you haven&apos;t already.</p>
                  <p className="text-yellow-400 break-all">
                    sudo wg-quick up ./{currentUsername || 'vpn-config'}
                    .conf
                  </p>
                  <p className="text-yellow-400 wrap-anywhere mt-2">
                    ssh -o StrictHostKeyChecking=no -o
                    UserKnownHostsFile=/dev/null
                    {' ' + currentUsername || 'null'}@{team?.ipAddress}
                  </p>
                  <p># Your password is the same as your username</p>
                </div>
              </div>
            </div>

            {/* Download/Close Buttons */}
            <div className="flex justify-center gap-x-6 flex-shrink-0">
              <button
                className="px-6 py-2.5 bg-green-600 rounded-xl hover:bg-green-500 transition font-bold "
                onClick={handleDownloadConfig}
              >
                Download Config
              </button>
              <button
                className="px-6 py-2.5 bg-red-600 rounded-xl hover:bg-red-500 transition font-bold "
                onClick={() => setShowVpn(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <FlagPopup />
    </>
  );
};

export default Lobby;
