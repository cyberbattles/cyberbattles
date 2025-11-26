'use client';
import React, {useState, useEffect, useCallback} from 'react';
import {auth, db} from '@/lib/firebase';
import {onAuthStateChanged, signOut} from 'firebase/auth';
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
import GameStartPopup from '@/components/GameStartPopup';
import ApiClient from '@/components/ApiClient';

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
        <div
          className="col-span-1 rounded-2xl bg-[#1e1e1e] p-6 shadow-md
            lg:col-span-3"
        >
          <h2 className="mb-4 text-xl font-semibold text-gray-400">
            Network Locations
          </h2>
          <p className="text-gray-500">
            Network locations will be shown here once the game is active.
          </p>
        </div>
      );
    }

    return (
      <div
        className="col-span-1 rounded-2xl bg-[#1e1e1e] p-6 shadow-md
          lg:col-span-3"
      >
        <h2 className="mb-6 text-xl font-semibold text-gray-100">
          Network Locations
        </h2>
        <div className="flex flex-wrap gap-4">
          {teams.map(team => {
            const url = `http://${team.ipAddress}:${port}`;
            return (
              <div
                key={team.id}
                className="min-w-[240px] flex-grow rounded-xl border
                  border-gray-700 bg-[#2a2a2a] p-4"
              >
                {/* Team Name */}
                <p className="mb-1 text-sm text-gray-400">{team.name}</p>
                <div className="flex items-center justify-between gap-4">
                  {/* Hyperlink */}
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="truncate font-mono text-lg font-bold
                      text-blue-400 hover:text-blue-300 hover:underline"
                    title={`Open ${url} in new tab`}
                  >
                    {url}
                  </a>
                  {/* Copy Button */}
                  <button
                    onClick={() => handleCopy(url)}
                    className="h-9 w-9 flex-shrink-0 cursor-pointer rounded-lg
                      bg-gray-800 p-2.5 text-gray-400 transition-colors
                      duration-200 hover:bg-gray-700"
                    title="Copy URL"
                  >
                    <FaRegCopy className="h-4 w-4" />
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
  const [gamestartonce, setgamestartonce] = useState(false);
  const [gameteamIp, setgameteamIp] = useState<any>(null);
  const [sessionTeams, setSessionTeams] = useState<SessionTeamInfo[]>([]);
  const [totalScore, setTotalScore] = useState<number>(0);
  const [uptimePercentage, setUptimePercentage] = useState<number>(100);
  const [showVpn, setShowVpn] = useState(false);
  const [popupChecked, setPopupChecked] = useState(false);
  const [shouldShowPopup, setShouldShowPopup] = useState(false);

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
    const unsubscribe = onAuthStateChanged(auth, async currentUser => {
      if (!currentUser || !gameTeamId.trim()) {
        setPopupChecked(true);
        return;
      }

      try {
        const teamRef = doc(db, 'teams', gameTeamId.trim());
        const docSnap = await getDoc(teamRef);

        if (docSnap.exists()) {
          const teamData = docSnap.data();

          if (teamData.shownpopup === true) {
            // Popup has already been shown
            setShouldShowPopup(false);
            setgamestartonce(true);
          } else {
            // Popup not shown yet
            setShouldShowPopup(true);
            setgamestartonce(false);
            await updateDoc(teamRef, {shownpopup: true});
          }
        }
      } catch (err) {
        console.log('Error in handling popup:', err);
      } finally {
        setPopupChecked(true);
      }
    });

    return () => unsubscribe();
  }, [gameTeamId]);

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
    const sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      return;
    }
    const unsubscribe = onSnapshot(
      doc(db, 'finishedSessions', sessionId),
      doc => {
        if (doc.exists()) {
          console.log('session has finished');
          handleEndGame();
        }
      },
    );
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

  const handlePopup = async () => {
    if (currentUser) {
      try {
        const teamRef = doc(db, 'teams', gameTeamId.trim());
        console.log(gameTeamId);
        const docSnap = await getDoc(teamRef);

        if (docSnap.exists()) {
          const teamData = docSnap.data();

          if (teamData.shownpopup === true) {
            setgamestartonce(true);
          }
          if (
            teamData.shownpopup === false ||
            teamData.shownpopup === undefined
          ) {
            setgamestartonce(true);
            await updateDoc(teamRef, {shownpopup: true});
          }
        }
      } catch {
        console.log('Error in handling popup');
      }
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

        const response = await ApiClient.get(
          `/config/${gameSessionId}/${gameTeamId}/${currentUser.uid}/${token}`,
        );

        if (response.status != 200) {
          console.error(`Failed to fetch config file: ${response.status}`);
          return;
        }

        const data = response.data;
        setVpnConfig(data.config);
      } catch (error) {
        console.error('Error fetching VPN config:', error);
      }
    };

    fetchVpnConfig();
  }, [currentUser, gameSessionId, gameTeamId]);

  return (
    <>
      {/* Start of game popup */}

      {shouldShowPopup &&
        popupChecked &&
        gameStatus === 'started' &&
        gamestartonce === false && (
          <GameStartPopup
            {...{
              teamName: team?.name || 'Team-1',
              isVisible: true,
              isAdmin: false,
              onClose: () => {
                handlePopup();
              },
            }}
          ></GameStartPopup>
        )}

      {/* End of game popup */}
      {/* Lobby Layout */}
      <div
        className="flex min-h-screen flex-col bg-[#2f2f2f] pt-20 text-white
          sm:pt-40 md:flex-row"
      >
        {/* Sidebar */}
        <aside
          className="w-full flex-shrink-0 border-r border-gray-800 bg-[#1e1e1e]
            shadow-2xl md:w-72"
        >
          <nav className="sticky top-40 p-6">
            <ul className="space-y-4">
              {/* Team Name */}
              <li>
                <div className="text-sm text-gray-400">Team Name:</div>
                <div className="text-lg font-semibold break-words text-blue-400">
                  {team?.name || '—'}
                </div>
              </li>
              {/* Team ID */}
              <li>
                <div className="text-sm text-gray-400">Team ID:</div>
                <div className="font-mono break-all text-gray-300">
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
                <div className="font-mono break-all text-blue-400">
                  {gameteamIp || 'N/A'}
                </div>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {/* Header */}
          <header
            className="mb-8 flex flex-col items-start justify-between gap-4
              sm:flex-row sm:items-center"
          >
            <h1 className="text-3xl font-bold">Session Lobby</h1>
            <div className="flex gap-4">
              <button
                className="cursor-pointer rounded-xl bg-gray-700 px-5 py-2.5
                  font-bold transition hover:bg-gray-600"
                onClick={handleLeaveLobby}
              >
                Leave Lobby
              </button>
              <button
                className="cursor-pointer rounded-xl bg-blue-600 px-5 py-2.5
                  font-bold transition hover:bg-blue-500"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </header>

          {/* Kicked Message */}
          {isKicked && (
            <div
              className="my-4 rounded-lg border border-red-500 bg-red-900/30
                p-4"
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-5 w-5 animate-spin rounded-full border-2
                    border-red-400 border-t-transparent"
                ></div>
                <span className="font-semibold text-red-400">
                  You have been kicked... Redirecting to dashboard.
                </span>
              </div>
            </div>
          )}

          {/* Stats Cards */}
          <section className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Total Score Card */}
            <div className="rounded-2xl bg-[#1e1e1e] p-6 shadow-md">
              <h3
                className="mb-2 text-sm font-medium tracking-wider text-gray-400
                  uppercase"
              >
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
            <div className="rounded-2xl bg-[#1e1e1e] p-6 shadow-md">
              <h3
                className="mb-2 text-sm font-medium tracking-wider text-gray-400
                  uppercase"
              >
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
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            {/* Current Scenario */}
            <div
              className="flex flex-col gap-5 rounded-2xl bg-[#1e1e1e] p-6
                shadow-md lg:col-span-3"
            >
              {currentScenario ? (
                <div className="flex flex-col items-center gap-6 text-center">
                  <div className="flex flex-col items-center gap-3 text-center">
                    <h2
                      className="text-sm tracking-wider text-gray-400 uppercase"
                    >
                      Current Scenario
                    </h2>
                    <h3 className="text-3xl font-bold text-white">
                      {currentScenario.scenario_title}
                    </h3>
                    <p className="max-w-md text-sm text-gray-300">
                      {currentScenario.scenario_description}
                    </p>
                    <span
                      className="mt-2 rounded-full border border-gray-600
                        bg-[#2f2f2f] px-4 py-1.5 text-sm font-semibold
                        text-gray-100"
                    >
                      {currentScenario.scenario_difficulty}
                    </span>
                  </div>
                  {gameStatus === 'starting' && (
                    <div
                      className="w-full max-w-md rounded-lg border
                        border-blue-500 bg-blue-900/30 p-3"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <div
                          className="h-4 w-4 animate-spin rounded-full border-2
                            border-blue-400 border-t-transparent"
                        ></div>
                        <span className="font-semibold text-blue-400">
                          Game starting...
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center">
                  <p className="text-gray-500">Loading scenario details...</p>
                </div>
              )}
            </div>

            {/* Team Members List */}
            <div
              className="flex flex-col gap-4 rounded-2xl bg-[#1e1e1e] p-6
                shadow-md lg:col-span-2"
            >
              <h2 className="text-2xl font-semibold text-green-400">
                {team?.name || 'Team'} Members
              </h2>
              <div className="flex flex-col gap-3">
                {players.size > 0 ? (
                  Array.from(players.values()).map(player => (
                    <div
                      className="flex items-center justify-between rounded-lg
                        bg-[#2f2f2f] p-3"
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

            {/* Actions Card */}
            <div
              className="flex flex-col gap-4 rounded-2xl bg-[#1e1e1e] p-6
                shadow-md lg:col-span-1"
            >
              <h2 className="mb-2 text-xl font-semibold text-gray-100">
                Actions
              </h2>
              {/* Shell Button */}
              <button
                className="w-full cursor-pointer rounded-xl bg-gray-700 px-4
                  py-3 font-bold transition hover:bg-gray-600"
                onClick={handlePushShell}
              >
                Go to Shell
              </button>
              {/* Traffic Button */}
              <button
                className="w-full cursor-pointer rounded-xl bg-gray-700 px-4
                  py-3 font-bold transition hover:bg-gray-600"
                onClick={handlePushTraffic}
              >
                View Network Traffic
              </button>

              <div className="my-2 border-t border-gray-700"></div>

              {/* Show VPN Button */}
              <button
                className="w-full cursor-pointer rounded-xl bg-blue-600 px-4
                  py-3 font-bold transition hover:bg-blue-500"
                onClick={() => setShowVpn(true)}
              >
                VPN Setup Guide
              </button>
              {/* Download VPN Button */}
              <button
                className="w-full cursor-pointer rounded-xl bg-green-600 px-4
                  py-3 font-bold transition hover:bg-green-500"
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
        <div
          className="bg-opacity-80 fixed inset-0 z-50 flex items-center
            justify-center bg-black p-4"
        >
          <div
            className="relative flex max-h-[90vh] w-full max-w-4xl flex-col
              gap-6 rounded-2xl border border-gray-700 bg-[#1e1e1e] p-6
              text-white shadow-2xl"
          >
            <h2 className="text-center text-2xl font-bold">
              VPN Configuration
            </h2>

            {/* Top section: textarea + QR code */}
            <div className="flex flex-col gap-6 overflow-y-auto md:flex-row">
              <textarea
                readOnly
                value={vpnConfig}
                className="flex-1 rounded-md border border-gray-700 bg-[#2f2f2f]
                  p-2 font-mono text-sm text-gray-300 focus:outline-none"
                rows={16}
              />

              <div className="flex flex-col items-center gap-4">
                <div className="rounded-md bg-white p-4">
                  <QRCode value={vpnConfig} size={200} />
                </div>
                <div
                  className="w-3/4 rounded-md bg-[#2f2f2f] p-3 font-mono text-xs
                    text-green-300"
                >
                  <p># Install wireguard if you haven&apos;t already.</p>
                  <p className="break-all text-yellow-400">
                    sudo wg-quick up ./{currentUsername || 'vpn-config'}
                    .conf
                  </p>
                  <p className="mt-2 wrap-anywhere text-yellow-400">
                    ssh -o StrictHostKeyChecking=no -o
                    UserKnownHostsFile=/dev/null
                    {' ' + currentUsername || 'null'}@{team?.ipAddress}
                  </p>
                  <p># Your password is the same as your username</p>
                </div>
              </div>
            </div>

            {/* Download/Close Buttons */}
            <div className="flex flex-shrink-0 justify-center gap-x-6">
              <button
                className="cursor-pointer rounded-xl bg-green-600 px-6 py-2.5
                  font-bold transition hover:bg-green-500"
                onClick={handleDownloadConfig}
              >
                Download Config
              </button>
              <button
                className="cursor-pointer rounded-xl bg-red-600 px-6 py-2.5
                  font-bold transition hover:bg-red-500"
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
