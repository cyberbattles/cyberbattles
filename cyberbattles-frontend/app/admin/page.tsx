'use client';
import {IoIosClose, IoIosRefresh, IoIosAddCircleOutline} from 'react-icons/io';
import React, {useState, useEffect, useCallback, useMemo} from 'react';
import {useRouter} from 'next/navigation';
import {db} from '@/lib/firebase';
import {
  collection,
  query,
  where,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  onSnapshot,
  Timestamp,
  serverTimestamp,
} from 'firebase/firestore';
import ApiClient from '@/components/ApiClient';
import {useAuth} from '@/components/Auth';
import {FaRegCopy} from 'react-icons/fa';
import QRCode from 'react-qr-code';
import GameEndPopup from '@/components/GameEndPopup';

/**
 * An interface representing a result of starting a session.
 */
interface StartSessionResult {
  /** True if the session was started successfully, false otherwise. */
  success: boolean;
  /** A message containing additional information about the start. */
  message: string;
  /** A dictionary of teams and their members if the start was successful. */
  teamsAndMembers?: {[key: string]: string[]};
}

/**
 * An interface representing a team in the session.
 */
export interface Team {
  /** The name of the team. */
  name: string;
  /** The number of members in the team. */
  numMembers: number;
  /** The user ids of each member of the team. */
  memberIds: string[];
  /** The UID of the team leader. */
  teamLeaderUid: string;
  /** The Docker containerId associated with the team. */
  containerId: string;
  /** A unique identifier for the team. */
  id: string;
  /** The session ID of the session this team belongs to. */
  sessionId: string;
  /** The IP address assigned to the team's container, on the WireGuard network. */
  ipAddress: string | null;
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

const formatElapsedTime = (milliseconds: number): string => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (num: number) => num.toString().padStart(2, '0');

  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

const Admin = () => {
  const router = useRouter();
  const [sessionIds, setSessionIds] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [players, setPlayers] = useState(new Map());
  const [currentScenario, setCurrentScenario] = useState<any | null>(null);
  const [gameStatus, setGameStatus] = useState('waiting'); // waiting, starting, active
  const [teams, setTeams] = useState(new Map());
  const {currentUser} = useAuth();
  const [createdAt, setCreatedAt] = useState<Timestamp | null>(null);
  const [startedAt, setStartedAt] = useState<Timestamp | null>(null);
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [vpnConfig, setVpnConfig] = useState<string | null>(null);
  const [showVpn, setShowVpn] = useState(false);
  const [vpnConfigLoading, setVpnConfigLoading] = useState(false);
  const [selectedTeamIdForVpn, setSelectedTeamIdForVpn] = useState<
    string | null
  >(null);
  const [vpnTeamSelectId, setVpnTeamSelectId] = useState<string>('');
  const [vpnTeamSelectIpAddress, setVpnTeamSelectIpAddress] =
    useState<string>('');
  const [username, setUsername] = useState<string>('');
  const [showEndGame, setShowEndGame] = useState(false);
  const [endedSessionId, setEndedSessionId] = useState<string>('');

  const NetworkLocations: React.FC<NetworkLocationsProps> = React.memo(
    ({teams, port, handleCopy}) => {
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
                  <p className="text-sm text-gray-400 mb-1">{team.name}</p>
                  <div className="flex items-center justify-between gap-4">
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-mono font-bold text-blue-400 truncate hover:text-blue-300 hover:underline"
                      title={`Open ${url} in new tab`}
                    >
                      {url}
                    </a>
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
  NetworkLocations.displayName = 'NetworkLocations';

  async function getSessions(uid: string) {
    try {
      const sessionRef = collection(db, 'sessions');
      const q = query(sessionRef, where('adminUid', '==', uid));

      const querySnapshot = await getDocs(q);
      const newSessionIds: string[] = [];
      querySnapshot.forEach(doc => {
        newSessionIds.push(doc.data().id);
      });

      setSessionIds(prevIds => {
        const existingIds = new Set(prevIds);
        const allIds = [...prevIds];
        newSessionIds.forEach(id => {
          if (!existingIds.has(id)) {
            allIds.push(id);
          }
        });
        return allIds;
      });

      if (newSessionIds.length > 0 && sessionId === '') {
        setSessionId(newSessionIds[0]);
      }
    } catch (error) {
      console.log('Failed', error);
    }
  }

  async function getTeams() {
    if (teams.size != 0) {
      return;
    }
    if (sessionId == '') {
      return;
    }
    try {
      let teamIds: string[] = [];
      const sessionRef = doc(db, 'sessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);
      if (sessionSnap.exists()) {
        teamIds = sessionSnap.data().teamIds;
      }
      teamIds.forEach(teamId => {
        addTeam(teamId);
      });
    } catch (error) {
      console.log('Failed', error);
    }
  }

  async function addTeam(tid: string) {
    try {
      const docRef = doc(db, 'teams', tid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const teamObj = docSnap.data();
        setTeams(prevTeams => new Map(prevTeams.set(tid, teamObj)));
      }
    } catch (error) {
      console.log("Couldn't find team", error);
    }
  }

  const getPlayers = async () => {
    const allPlayerIds = new Set<string>();
    teams.forEach(team => {
      team.memberIds.forEach((id: string) => allPlayerIds.add(id));
    });
    if (allPlayerIds.size === 0) {
      setPlayers(new Map());
      return;
    }
    const playerPromises = Array.from(allPlayerIds).map(id => getUser(id));
    try {
      const playerDocs = await Promise.all(playerPromises);
      const newPlayers = new Map();
      playerDocs.forEach((playerDoc, index) => {
        if (playerDoc) {
          const playerId = Array.from(allPlayerIds)[index];
          newPlayers.set(playerId, playerDoc);
        }
      });
      setPlayers(newPlayers);
    } catch (error) {
      console.error('Failed to fetch all players:', error);
    }
  };

  async function getUser(uid: string) {
    let ret = null;
    try {
      const docRef = doc(db, 'login', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        ret = docSnap.data();
      }
    } catch (error) {
      console.log('Failed', error);
    }
    return ret;
  }

  const removePlayer = async (tid: string, uid: string) => {
    const newMembers: string[] = [];
    teams.get(tid).memberIds.forEach((value: string) => {
      if (value != uid) {
        newMembers.push(value);
      }
    });
    const docRef = doc(db, 'teams', tid);
    await updateDoc(docRef, {
      memberIds: newMembers,
    })
      .then(() => {
        console.log('Team doc successfully updated');
      })
      .catch((error: any) => {
        console.error('Error updating document: ', error);
      });
  };

  const refreshTeams = async () => {
    setTeams(new Map());
    setPlayers(new Map());
    getTeams();
    getPlayers();
  };

  useEffect(() => {
    if (!sessionId) {
      setTeams(new Map());
      setPlayers(new Map());
      return;
    }
    const teamsQuery = query(
      collection(db, 'teams'),
      where('sessionId', '==', sessionId),
    );
    const unsubscribe = onSnapshot(teamsQuery, querySnapshot => {
      const newTeams = new Map<string, Team>();
      querySnapshot.forEach(doc => {
        const teamData = {...doc.data(), id: doc.id} as Team;
        newTeams.set(doc.id, teamData);
      });
      setTeams(newTeams);
    });
    return () => {
      unsubscribe();
    };
  }, [currentUser, sessionId]);

  // Get the current scenario information
  async function getScenario() {
    if (sessionId == '') {
      // Clear timestamps if no session is selected
      setCreatedAt(null);
      setStartedAt(null);
      setCurrentScenario(null);
      return;
    }
    try {
      const sessionRef = doc(db, 'sessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);
      let scenarioId = '';
      if (sessionSnap.exists()) {
        const sessionData = sessionSnap.data();
        setCreatedAt(sessionData.createdAt || null);
        setStartedAt(sessionData.startedAt || null);

        scenarioId = sessionData.scenarioId;

        // Check if the session has already started
        const started = sessionSnap.data().started;
        if (started && gameStatus != 'ending') {
          setGameStatus('started');
        } else {
          setGameStatus('waiting');
        }
      } else {
        // Reset if session doc doesn't exist
        setCreatedAt(null);
        setStartedAt(null);
      }

      const scenearioRef = doc(db, 'scenarios', scenarioId);
      const scenarioSnap = await getDoc(scenearioRef);
      if (scenarioSnap.exists()) {
        setCurrentScenario(scenarioSnap.data());
      }
    } catch (error) {
      console.log('Failed', error);
      setCreatedAt(null);
      setStartedAt(null);
    }
  }

  // Start the session
  async function startSession() {
    try {
      if (!currentUser) {
        throw new Error('No current user');
      }
      const token = await currentUser.getIdToken(true);
      const response = await ApiClient.post('/start-session', {
        sessionId: sessionId,
        token: token,
      });

      switch (response.status) {
        case 200:
          const result: StartSessionResult = response.data;
          let teamIds: string[] = [];
          if (result.teamsAndMembers) {
            teamIds = Object.keys(result.teamsAndMembers);
          }
          localStorage.setItem('sessionId', sessionId);
          return true;
        case 400:
          throw new Error(response.data.result);
        case 401:
          throw new Error('The user is not authenticated');
        case 500:
          throw new Error(response.data.result);
        default:
          return false;
      }
    } catch (error) {
      console.error('Error starting session:', error);
      return false;
    }
  }

  // Cleanup the session
  async function cleanupSession(sessionId: string) {
    if (!currentUser) return false;

    // Populate the finished session and set the ended session value
    const finishedRef = doc(db, 'finishedSessions', sessionId);

    interface ScoreDictionary {
      [key: string]: [string, number];
    }

    // Add each team and their score to scoremap
    let scoreMap: ScoreDictionary = {};

    const fetchTeamPromises = Array.from(teams.keys()).map(async id => {
      const teamRef = doc(db, 'teams', id);
      const teamSnap = await getDoc(teamRef);
      if (!teamSnap.exists()) {
        return;
      }
      const team = teamSnap.data();
      const teamName: string = team.name;
      const score: number = team.totalScore;

      scoreMap[id] = [teamName, score];
    });

    await Promise.all(fetchTeamPromises);

    await setDoc(finishedRef, {
      results: scoreMap,
    });

    // Create the api request url
    const token = await currentUser.getIdToken(true);
    const request = '/cleanup/' + sessionId + '/' + token;
    try {
      const response = await ApiClient.get(request);
      switch (response.status) {
        case 200:
          return true;
        case 400:
          throw new Error('The sessionId is invalid');
        case 401:
          throw new Error('The user is not authenticated');
        case 403:
          throw new Error('The user is not the session admin');
        case 404:
          throw new Error('The session does not exist');
        case 500:
          throw new Error('Internal server error');
        default:
          throw new Error('An unknown error occurred');
      }
    } catch (error) {
      console.error('Error cleaning session:', error);
      return false;
    }
  }

  const handleChangeSession = async (sid: string) => {
    setTeams(new Map());
    setPlayers(new Map());
    setSessionId(sid);
    localStorage.setItem('sessionId', sid);
    // Reset timers when changing session
    setElapsedTime('00:00:00');
    setStartedAt(null);
    setCreatedAt(null);
  };

  const handleStartGame = async () => {
    if (!sessionId || !currentUser) {
      console.log('No current admin user or session');
      return;
    }
    setGameStatus('starting');
    await startSession().then(async value => {
      if (value) {
        try {
          const sessionRef = doc(db, 'sessions', sessionId);
          await updateDoc(sessionRef, {
            startedAt: serverTimestamp(),
          });
          setStartedAt(Timestamp.now());
        } catch (error) {
          console.error('Failed to update startedAt:', error);
        }
        setGameStatus('started');
      } else {
        setGameStatus('waiting');
      }
    });
  };

  const handleEndGame = async () => {
    if (!sessionId || !currentUser) {
      console.log('No current admin user or session');
      return;
    }
    setEndedSessionId(sessionId);
    const endedSessionIdLocal = sessionId;
    setSessionIds(sessionIds.filter(sid => sid !== endedSessionIdLocal));
    setGameStatus('ending');

    if (sessionIds.length - 1 > 0) {
      setShowEndGame(true);
      setSessionId(sessionIds[0]);
      getTeams();
      getPlayers();
      getScenario();
      await cleanupSession(endedSessionIdLocal);
    } else {
      setSessionId('');
      setGameStatus('ending');

      await cleanupSession(endedSessionIdLocal);
      setGameStatus('ended');
      router.push('/dashboard?sessionId=' + endedSessionIdLocal);
    }
  };

  const handleCreateSession = () => {
    router.push('/create-session');
  };

  // Set the teams, players, and scenario hooks
  useEffect(() => {
    if (currentUser) {
      if (sessionId == '') {
        getSessions(currentUser.uid);
      }
      getTeams();
      getPlayers();
      getScenario();
    }
  }, [currentUser, teams, sessionId]);

  useEffect(() => {
    let timerInterval: NodeJS.Timeout;

    if (gameStatus === 'started' && startedAt) {
      timerInterval = setInterval(() => {
        const now = Timestamp.now().toMillis();
        const start = startedAt.toMillis();
        const diff = now - start;
        setElapsedTime(formatElapsedTime(diff));
      }, 1000);
    } else {
      // If game is not 'started', reset timer display
      if (gameStatus !== 'started') {
        setElapsedTime('00:00:00');
      }
    }

    return () => {
      clearInterval(timerInterval);
    };
  }, [gameStatus, startedAt, sessionId]);

  const handleCopy = useCallback(async (text: string) => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      console.error('Failed to copy text:', error);
    }
  }, []);

  // Memoized array of teams for the NetworkLocations component
  const sessionTeams: SessionTeamInfo[] = useMemo(() => {
    return Array.from(teams.values()).map(team => ({
      id: team.id,
      name: team.name,
      ipAddress: team.ipAddress || 'N/A',
    }));
  }, [teams, sessionId]);

  const handlePushShell = () => router.push('/shell');
  const handlePushTraffic = () => router.push('/network-traffic');

  const openVpnModal = () => {
    setVpnConfig(null);
    setSelectedTeamIdForVpn(null);
    setVpnConfigLoading(false);
    // Pre-select the first team in the dropdown
    setVpnTeamSelectId(Array.from(teams.keys())[0] || '');
    setShowVpn(true);
  };

  const closeVpnModal = () => {
    setShowVpn(false);
    setVpnConfig(null);
    setSelectedTeamIdForVpn(null);
    setVpnConfigLoading(false);
  };

  const fetchVpnConfigForTeam = async (teamId: string) => {
    if (!currentUser || !sessionId || !teamId) {
      console.error('Missing user, session, or team ID');
      return;
    }

    const team = teams.get(teamId);
    if (!team) {
      setVpnConfig(null);
      return;
    }
    setVpnTeamSelectIpAddress(team.ipAddress || '');

    // Lookup admin username for filename and ssh
    const adminDoc = await getDoc(doc(db, 'login', currentUser.uid));
    const username = (await adminDoc.data()?.userName) || 'admin';
    setUsername(username);

    setVpnConfigLoading(true);
    setVpnConfig(null);
    setSelectedTeamIdForVpn(teamId);

    try {
      const token = await currentUser.getIdToken();
      
      const response = await ApiClient.get(`/config/${sessionId}/${teamId}/${currentUser.uid}/${token}`);

      if (response.status != 200) {
        console.error(`Failed to fetch config file: ${response.status}`);
        setVpnConfig(null);
        setVpnConfigLoading(false);
        return;
      }

      const data = response.data;
      setVpnConfig(data.config);
    } catch (error) {
      console.error('Error fetching VPN config:', error);
      setVpnConfig(null);
    }
    setVpnConfigLoading(false);
  };

  const handleDownloadConfig = async () => {
    if (!currentUser || !vpnConfig || !selectedTeamIdForVpn) {
      return;
    }

    try {
      const blob = new Blob([vpnConfig], {type: 'text/plain'});
      const blobUrl = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${username}.conf`;
      document.body.appendChild(a);
      a.click();

      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading config:', error);
    }
  };
  return (
    <>
      {/* End of game popup */}
      {showEndGame && (
        <GameEndPopup
          {...{
            isVisible: true,
            isAdmin: true,
            isOpen: true,
            onClose: () => {
              setShowEndGame(false);
            },
            sessionId: endedSessionId || '',
            continueAdministering: true,
          }}
        ></GameEndPopup>
      )}
      <div className="flex flex-col md:flex-row min-h-screen pt-25 sm:pt-40 bg-[#2f2f2f] text-white">
        {/* Sidebar */}
        <aside className="w-full md:w-64 bg-[#1e1e1e] shadow-md flex-shrink-0">
          <nav className="p-6">
            <ul className="space-y-4">
              <li>
                <div className="text-sm text-gray-400">Teams:</div>
                <div className="font-semibold text-white">{teams.size}</div>
              </li>
              <li>
                <div className="text-sm text-gray-400">Total Players:</div>
                <div className="font-semibold">{0 || players.size}</div>
              </li>
              <li>
                <div className="text-sm text-gray-400">Status:</div>
                <div
                  className={`font-semibold capitalize ${
                    gameStatus === 'waiting'
                      ? 'text-yellow-400'
                      : gameStatus === 'starting'
                        ? 'text-blue-400'
                        : gameStatus === 'ending' || gameStatus === 'ended'
                          ? 'text-red-400'
                          : 'text-green-400'
                  }`}
                >
                  {gameStatus === 'starting' ? 'Starting...' : gameStatus}
                </div>
              </li>
              <li className="pt-2 border-t border-gray-700">
                <div className="text-sm text-gray-400">Game created at:</div>
                <div className="font-semibold text-sm">
                  {createdAt
                    ? `${createdAt
                        .toDate()
                        .toLocaleTimeString()
                        .replaceAll(' ', '')} ${createdAt
                        .toDate()
                        .toLocaleDateString()}`
                    : 'Loading...'}
                </div>
              </li>
              {gameStatus === 'started' && startedAt && (
                <li>
                  <div className="text-sm text-gray-400">Time Elapsed:</div>
                  <div className="font-semibold text-lg text-blue-300 font-mono">
                    {elapsedTime}
                  </div>
                </li>
              )}
            </ul>
          </nav>
        </aside>

        <main className="flex-1 p-4 md:p-8 overflow-auto">
          {/* Title Section */}
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold">Admin Panel</h1>
              <button
                onClick={handleCreateSession}
                className="flex items-center gap-2 px-3 py-2 bg-green-600 rounded-xl hover:bg-green-500 transition font-bold text-sm "
                title="Create New Session"
              >
                <IoIosAddCircleOutline size={20} />
                <span className="hidden sm:inline">New Session</span>
              </button>
            </div>
            {sessionIds.length > 0 && (
              <div className="flex items-center gap-3">
                <label
                  htmlFor="session-select"
                  className="text-sm text-gray-400"
                >
                  Active Session:
                </label>
                <select
                  id="session-select"
                  value={sessionId}
                  onChange={e => handleChangeSession(e.target.value)}
                  className="bg-[#1e1e1e] border border-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full md:w-auto p-2.5"
                >
                  {sessionIds.map(id => (
                    <option key={id} value={id}>
                      {id}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </header>

          {/* Grid Layout*/}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Actions Widget */}
            <div className="flex flex-col p-6 gap-4 bg-[#1e1e1e] rounded-2xl shadow-md col-span-1">
              <h2 className="text-xl font-semibold text-gray-100 mb-2">
                Actions
              </h2>
              <button
                className="w-full px-4 py-3 bg-gray-700 rounded-xl hover:bg-gray-600 transition font-bold"
                onClick={handlePushShell}
              >
                Go to Shell
              </button>
              <button
                className="w-full px-4 py-3 bg-gray-700 rounded-xl hover:bg-gray-600 transition font-bold"
                onClick={handlePushTraffic}
              >
                View Network Traffic
              </button>

              <div className="border-t border-gray-700 my-2"></div>

              <button
                className="w-full px-4 py-3 bg-blue-600 rounded-xl hover:bg-blue-500 transition font-bold "
                onClick={openVpnModal}
              >
                VPN Setup Guide
              </button>
            </div>

            {/* Current Scenario */}
            <div className="flex flex-col justify-center items-center p-6 bg-[#1e1e1e] rounded-2xl shadow-md col-span-1 h-full min-h-[250px]">
              {currentScenario ? (
                <div className="flex flex-col items-center text-center gap-6">
                  <div className="flex flex-col items-center text-center gap-3">
                    <h2 className="text-gray-400 text-sm uppercase tracking-wider">
                      Current Scenario
                    </h2>
                    <h3 className="text-3xl font-bold text-white">
                      {currentScenario.scenario_title}
                    </h3>
                    <p className="text-gray-300 text-sm max-w-md">
                      {currentScenario.scenario_description}
                    </p>
                    <span className="mt-2 px-4 py-1.5 bg-[#2f2f2f] text-gray-100 text-sm font-semibold rounded-full border border-gray-600">
                      {currentScenario.scenario_difficulty}
                    </span>
                  </div>
                  {gameStatus === 'starting' && (
                    <div className="p-3 bg-blue-900/30 border border-blue-500 rounded-lg w-full max-w-md">
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                        <span className="text-blue-400 font-semibold">
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

            {/* Host Controls */}
            <div className="p-6 bg-[#1e1e1e] rounded-2xl shadow-md col-span-1">
              <h2 className="text-xl font-semibold mb-4 text-white">
                Host Controls
              </h2>
              <div className="space-y-3 gap-5">
                <div className="space-y-4">
                  {(gameStatus === 'waiting' || gameStatus === 'starting') && (
                    <div className="p-3 bg-[#2f2f2f] rounded-lg">
                      <div className="text-sm text-gray-400 mb-5">
                        Begin Session
                      </div>
                      <button
                        onClick={handleStartGame}
                        disabled={gameStatus === 'starting'}
                        className={`w-full px-4 py-3 rounded-xl font-bold transition ${
                          gameStatus !== 'starting'
                            ? 'bg-blue-600 hover:bg-blue-500 '
                            : 'bg-gray-600 cursor-not-allowed opacity-50'
                        }`}
                      >
                        {gameStatus === 'starting'
                          ? 'Starting Game...'
                          : 'Start Game'}
                      </button>
                    </div>
                  )}
                  <div className="p-3 bg-[#2f2f2f] rounded-lg">
                    <div className="text-sm text-gray-400 mb-5">
                      End Session
                    </div>
                    <button
                      onClick={handleEndGame}
                      disabled={gameStatus === 'ending'}
                      className={`w-full px-4 py-3 rounded-xl font-bold transition ${
                        gameStatus !== 'ending'
                          ? 'bg-red-600 hover:bg-red-500 '
                          : 'bg-gray-600 cursor-not-allowed opacity-50'
                      }`}
                    >
                      {gameStatus === 'ending' ? 'Ending...' : 'End Session'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Teams Title */}
            <div className="p-6 pb-0 rounded-2xl col-span-1 lg:col-span-3">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">Teams</h2>
                <div className="" onClick={() => refreshTeams()}>
                  <IoIosRefresh size={20} className="cursor-pointer" />
                </div>
              </div>
            </div>

            {/* Teams List */}
            {Array.from(teams.values()).map(value => (
              <div
                className="flex flex-col p-5 gap-5 bg-[#1e1e1e] rounded-2xl shadow-md col-span-1"
                key={value.id}
              >
                <div className="flex flex-row justify-between items-center">
                  <h2 className="text-xl font-semibold text-green-400">
                    {value.name}
                  </h2>
                </div>
                <div className="flex flex-col gap-5">
                  {value.memberIds.map((uid: string) => (
                    <div
                      className="flex items-center justify-between p-3 bg-[#2f2f2f] rounded-lg"
                      key={uid}
                    >
                      <div>
                        {players &&
                          players.get(uid) &&
                          players.get(uid).userName}
                      </div>
                      <div
                        className="cursor-pointer text-red-400 hover:text-red-300"
                        onClick={() => removePlayer(value.id, uid)}
                      >
                        <IoIosClose size={30} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex h-full align-bottom items-end mt-4">
                  <div className="flex flex-row px-2 pt-3 w-full justify-between items-center border-t border-gray-700">
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-md font-semibold text-white flex-shrink-0">
                        Team ID:
                      </span>
                      <a
                        href={`https://cyberbattl.es/join-team?teamId=${value.id}`} 
                        // ^ This needs to be changed if backend on localhost
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-blue-400 hover:text-blue-300 hover:underline truncate"
                        title="Open join link in new tab"
                      >
                        {value.id}
                      </a>
                    </div>
                    <button
                      onClick={() =>
                        handleCopy(
                          `https://cyberbattl.es/join-team?teamId=${value.id}`,
                          // ^ This too!
                        )
                      }
                      className="flex-shrink-0 p-2 rounded-lg bg-gray-700 text-gray-400 hover:bg-gray-600 transition-colors duration-200"
                      title="Copy Team ID"
                    >
                      <FaRegCopy className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <NetworkLocations
              teams={sessionTeams}
              port={currentScenario?.port}
              handleCopy={handleCopy}
            />
          </section>
        </main>
      </div>

      {showVpn && (
        <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1e1e1e] text-white p-6 rounded-2xl w-full max-w-4xl relative flex flex-col gap-6 max-h-[90vh] shadow-2xl border border-gray-700">
            {!selectedTeamIdForVpn && !vpnConfigLoading && (
              // Team Selection View
              <div className="flex flex-col items-center gap-6">
                <h2 className="text-2xl font-bold text-center">
                  Select Team for VPN Config
                </h2>
                <p className="text-gray-400">
                  Please select which team you would like a VPN Config for.
                </p>
                <select
                  value={vpnTeamSelectId}
                  onChange={e => setVpnTeamSelectId(e.target.value)}
                  className="bg-[#2f2f2f] border border-gray-700 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full max-w-md p-2.5"
                >
                  {Array.from(teams.values()).map(team => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
                <div className="flex justify-center gap-x-6 mt-4">
                  <button
                    className="px-6 py-2.5 bg-blue-600 rounded-xl hover:bg-blue-500 transition font-bold"
                    onClick={() => fetchVpnConfigForTeam(vpnTeamSelectId)}
                    disabled={!vpnTeamSelectId || teams.size === 0}
                  >
                    Get Config
                  </button>
                  <button
                    className="px-6 py-2.5 bg-red-600 rounded-xl hover:bg-red-500 transition font-bold"
                    onClick={closeVpnModal}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {vpnConfigLoading && (
              // Loading View
              <div className="flex flex-col items-center justify-center gap-6 min-h-[300px]">
                <div className="animate-spin h-10 w-10 border-4 border-blue-400 border-t-transparent rounded-full"></div>
                <h2 className="text-2xl font-semibold text-blue-300">
                  Fetching Config...
                </h2>
              </div>
            )}

            {vpnConfig && selectedTeamIdForVpn && !vpnConfigLoading && (
              // Config View
              <>
                <h2 className="text-2xl font-bold text-center">
                  VPN Configuration for {teams.get(selectedTeamIdForVpn)?.name}
                </h2>

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
                        sudo wg-quick up ./
                        {username || 'wg1'}
                        .conf
                      </p>
                      <p className="text-yellow-400 wrap-anywhere mt-2">
                        ssh -o StrictHostKeyChecking=no -o
                        UserKnownHostsFile=/dev/null
                        {' ' + username || 'null'}@{vpnTeamSelectIpAddress}
                      </p>
                      <p># Your password is the same as your username</p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center gap-x-6 flex-shrink-0">
                  <button
                    className="px-6 py-2.5 bg-gray-600 rounded-xl hover:bg-gray-500 transition font-bold"
                    onClick={() => setSelectedTeamIdForVpn(null)}
                  >
                    Back
                  </button>
                  <button
                    className="px-6 py-2.5 bg-green-600 rounded-xl hover:bg-green-500 transition font-bold"
                    onClick={handleDownloadConfig}
                  >
                    Download Config
                  </button>
                  <button
                    className="px-6 py-2.5 bg-red-600 rounded-xl hover:bg-red-500 transition font-bold"
                    onClick={closeVpnModal}
                  >
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default Admin;
