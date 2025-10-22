'use client';
import {IoIosClose, IoIosRefresh} from 'react-icons/io';
import React, {useState, useEffect} from 'react';
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
} from 'firebase/firestore';
import Navbar from '@/components/Navbar';
import ApiClient from '@/components/ApiClient';
import {useAuth} from '@/components/Auth';
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

const Admin = () => {
  const [sessionIds, setSessionIds] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState('');
  const [players, setPlayers] = useState(new Map());
  const [currentScenario, setCurrentScenario] = useState<any | null>(null);
  const [gameStatus, setGameStatus] = useState('waiting'); // waiting, starting, active
  const router = useRouter();

  const [teams, setTeams] = useState(new Map());
  const {currentUser} = useAuth();

  async function getSessions(uid: string) {
    try {
      const sessionRef = collection(db, 'sessions');
      const q = query(sessionRef, where('adminUid', '==', uid));

      // Iterate through the sessions and add all ids to the array
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach(doc => {
        const newId = doc.data().id;
        const newSessionIds: string[] = sessionIds;

        // Only add the sessionId if its not in the array already
        if (!sessionIds.find(id => id == newId)) {
          newSessionIds.push(newId);
          setSessionIds(newSessionIds);
        }
      });

      // If sessions were found, set the current to be the first
      if (sessionIds.length != 0) {
        setSessionId(sessionIds[0]);
      }
    } catch (error) {
      console.log('Failed', error);
    }
  }

  // Find the teams associated with the session admin id
  async function getTeams() {
    if (teams.size != 0) {
      return;
    }

    // If sessionId is not set then do nothing
    if (sessionId == '') {
      return;
    }

    try {
      // Get the teamIds array
      let teamIds: string[] = [];
      const sessionRef = doc(db, 'sessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);
      if (sessionSnap.exists()) {
        teamIds = sessionSnap.data().teamIds;
        if (sessionSnap.data().started && gameStatus != 'ending') {
          console.log('setting started')
          setGameStatus('started');
        }
      }

      teamIds.forEach(teamId => {
        addTeam(teamId);
      });
    } catch (error) {
      console.log('Failed', error);
    }
  }

  // Helper function for adding teams to the teams state
  async function addTeam(tid: string) {
    try {
      const docRef = doc(db, 'teams', tid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const teamObj = docSnap.data();
        teams.set(tid, teamObj);
        setTeams(new Map(teams));
      }
    } catch (error) {
      console.log("Couldn't find team", error);
    }
  }

  // Populate the players hook with map (uid, player doc)
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

  // Get the document object associated with given uid
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
    // Create a new members array without the given uid
    const newMembers: string[] = [];
    teams.get(tid).memberIds.forEach((value: string) => {
      if (value != uid) {
        newMembers.push(value);
      }
    });

    // Update the memberids field in the team document on firestore
    // Get the team document
    const docRef = doc(db, 'teams', tid);

    // Update the team document
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
    // Reinitialise the use state hooks to remove member

    setTeams(new Map());
    setPlayers(new Map());

    getTeams();
    getPlayers();
  };

  // Listen for changes to docs in the teams collection with the current sessionId
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
    // Check if the sessionId has been set, if not return
    if (sessionId == '') {
      return;
    }
    try {
      // Find the session doc
      const sessionRef = doc(db, 'sessions', sessionId);
      const sessionSnap = await getDoc(sessionRef);
      let scenarioId = '';
      if (sessionSnap.exists()) {
        scenarioId = sessionSnap.data().scenarioId;
        // Check if the session has already started
        const started = sessionSnap.data().started;
        if (started) {
          setGameStatus('started');
        }
      }

      // Find the scenario doc
      const scenearioRef = doc(db, 'scenarios', scenarioId);
      const scenarioSnap = await getDoc(scenearioRef);
      if (scenarioSnap.exists()) {
        setCurrentScenario(scenarioSnap.data());
      }
    } catch (error) {
      console.log('Failed', error);
    }
  }

  // Start the session
  async function startSession() {
    // Send the api request
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

          // Get the team ids from the result
          let teamIds: string[] = [];
          if (result.teamsAndMembers) {
            teamIds = Object.keys(result.teamsAndMembers);
          }

          // Store the sessionId in local storage
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
  async function cleanupSession() {
    if (!currentUser) return false;

    // Set the started value to false and wait 10 seconds
    // const sessionRef = doc(db, 'sessions', sessionId);
    // await updateDoc(sessionRef, {
    //   started: false,
    // });
    // const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms)); 
    // delay(10);
    // setGameStatus('ended');

    // Populate the finished session and set the ended session value
    localStorage.setItem('finishedSession', sessionId);
    const finishedRef = doc(db, 'finishedSessions', sessionId);

    interface ScoreDictionary {
      [key: string]: number;
    }
    
    // Add each team and their score to scoremap
    let scoreMap: ScoreDictionary = {};

    Array.from(teams.keys()).map(async (id) => {
      const teamRef = doc(db, 'teams', id);
      const teamSnap = await getDoc(teamRef);
      if (!teamSnap.exists()) {
        return;
      }
      const team = teamSnap.data();
      const teamName:string = team.name;
      const score:number = team.totalScore;

      scoreMap[teamName] = score;
    })
    
    await setDoc(finishedRef, {
      results: scoreMap,
    })

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
  };

  const handleStartGame = async () => {
    // If not currently admin of a session, do nothing
    if (!sessionId || !currentUser) {
      console.log('No current admin user or session');
      return;
    }
    setGameStatus('starting');
    await startSession().then(value => {
      if (value) {
        setGameStatus('started');
      } else {
        // Tell the user that something went wrong +++
        setGameStatus('waiting');
      }
    });
  };

  const handleEndGame = async () => {
    // If not currently admin of a session, do nothing
    if (!sessionId || !currentUser) {
      console.log('No current admin user or session');
      return;
    }
    setGameStatus('ending');
    await cleanupSession();
    setGameStatus('ended');
    router.push('/dashboard')
  };

  // Set the teams, players, and scenario hooks
  useEffect(() => {
    // Populate the team hook and check if user is host
    if (currentUser) {
      if (sessionId == '') {
        getSessions(currentUser.uid);
      }
      getTeams();
      getPlayers();
      getScenario();
    }
  }, [currentUser, teams, sessionId]);

  return (
    <>
      {/* Lobby Layout */}
      <div className="flex h-screen pt-40 bg-[#2f2f2f] text-white">
        {/* Sidebar */}
        <aside className="w-64 bg-[#1e1e1e] shadow-md">
          <div className="p-6 text-xl font-bold border-b border-gray-700">
            Session Lobby
          </div>
          <nav className="p-6">
            <ul className="space-y-4">
              <li>
                <div className="text-sm text-gray-400 mb-1">Teams:</div>
                <div className="font-semibold text-white">
                  {Array.from(teams.values()).map(value => (
                    <h1 key={value.id}>{value.name}</h1>
                  ))}
                </div>
              </li>
              <li>
                <div className="text-sm text-gray-400">Players:</div>
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
                        : (gameStatus === 'ending' || gameStatus === 'ended')
                          ? 'text-red-400'
                          : 'text-green-400'
                  }`}
                >
                  {gameStatus === 'starting' ? 'Starting...' : gameStatus}
                </div>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8 overflow-auto">
          {/* Header */}
          <header className="flex justify-between items-center gap-10 mb-8 mr-10">
            <h1 className="text-2xl font-bold">Session Lobby</h1>
            <ul className="flex flex-col gap-5 text-sm md:flex-row ">
              {sessionIds.map(id => (
                <button
                  className={`px-4 py-2 rounded-xl hover:opacity-90 transition font-bold ${
                    id === sessionId ? 'bg-gray-600 ' : 'bg-[#1e1e1e]'
                  }`}
                  onClick={() => handleChangeSession(id)}
                  key={id}
                >
                  {id}
                </button>
              ))}
            </ul>
          </header>

          {/* Lobby Content */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Scenario */}
            <div className="flex flex-col p-5 gap-5 bg-[#1e1e1e] rounded-2xl shadow-md col-span-2 lg:col-span-1">
              <h2 className="text-xl font-semibold mb-4 border-b text-blue-400">
                Current Scenario
              </h2>
              {currentScenario && (
                <div className="flex flex-col gap-2 text-l text-white">
                  <p>{currentScenario.scenario_title}</p>
                  <p>{currentScenario.scenario_description}</p>
                  <div className="flex gap-10 font-semibold">
                    <p>Scenario difficulty:</p>
                    <p>{currentScenario.scenario_difficulty}</p>
                  </div>
                </div>
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

            {/* Teams */}
            <div className="p-6 rounded-2xl col-span-2 ">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">Teams</h2>
                <div className="" onClick={() => refreshTeams()}>
                  <IoIosRefresh size={20} />
                </div>
              </div>
            </div>

            {/* Teams List */}
            {Array.from(teams.values()).map(value => (
              <div
                className="flex flex-col p-5 gap-5 bg-[#1e1e1e] rounded-2xl shadow-md col-span-2 lg:col-span-1"
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
                        className=""
                        onClick={() => removePlayer(value.id, uid)}
                      >
                        <IoIosClose size={30} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex h-full align-bottom items-end">
                  <div className="flex flex-row px-2 pt-3 w-full justify-between border-t">
                    <h2 className="text-l font-semibold text-white">
                      Team ID: {value.id}
                    </h2>
                  </div>
                </div>
              </div>
            ))}

            {/* Game Controls */}
            <div className="p-6 rounded-2xl lg:col-span-2">
              <h2 className="text-2xl font-semibold">Game Controls</h2>
            </div>

            <div className="p-6 bg-[#1e1e1e] rounded-2xl shadow-md col-span-2 lg:col-span-1">
              <h2 className="text-xl font-semibold mb-4 text-white">
                Host Controls
              </h2>
              <div className="space-y-3 gap-5">
                {
                  <div className="space-y-4">
                    {(gameStatus === 'waiting' ||
                      gameStatus === 'starting') && (
                      <div className="p-3 bg-[#2f2f2f] rounded-lg">
                        <div className="text-sm text-gray-400 mb-5">
                          Begin Session
                        </div>
                        <button
                          onClick={handleStartGame}
                          disabled={gameStatus === 'starting'}
                          className={`w-full px-4 py-3 rounded-xl font-bold transition ${
                            gameStatus !== 'starting'
                              ? 'bg-green-600 hover:opacity-90'
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
                            ? 'bg-red-600 hover:opacity-90'
                            : 'bg-gray-600 cursor-not-allowed opacity-50'
                        }`}
                      >
                        {gameStatus === 'ending' ? 'Ending...' : 'End Session'}
                      </button>
                    </div>
                  </div>
                }
              </div>
            </div>

            <div className="p-6 bg-[#1e1e1e] rounded-2xl shadow-md col-span-2 lg:col-span-1">
              <h2 className="text-xl font-semibold mb-4 text-white">
                Session Info
              </h2>
              <div className="space-y-3 gap-5">
                <div className="space-y-4">
                  <div className="mt-4 p-3 bg-[#2f2f2f] rounded-lg">
                    <div className="text-sm text-gray-400 mb-2">
                      Scenario Info
                    </div>
                    <div className="text-sm space-y-1">
                      <div>Name: ubuntu - basic</div>
                      <div>Challenges: 5</div>
                      <div>Difficulty: Beginner</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
};

export default Admin;
