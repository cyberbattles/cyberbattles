'use client';
import React, {useState, useEffect} from 'react';
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
import {useAuth} from '@/components/Auth';
import GameEndPopup from '@/components/GameEndPopup';

const Lobby = () => {
  const router = useRouter();
  const [teamId, setTeamId] = useState(null);
  const [players, setPlayers] = useState(new Map());
  const [currentScenario, setCurrentScenario] = useState<any | null>(null);
  const [gameStatus, setGameStatus] = useState(''); // waiting, starting, started, ended
  const [, setIsHost] = useState(false);
  const [gameId, setgameId] = useState<any>(null);

  const [team, setTeam] = useState<any>(null);
  const {currentUser} = useAuth();
  const [isKicked, setIsKicked] = useState(false);

  // Get the current scenario information
  async function getScenario() {
    // Check if the sessionId has been set, if not return
    if (teamId == '') {
      return;
    }
    try {
      // Find the session doc
      const sessionRef = doc(db, 'sessions', team.sessionId);
      const sessionSnap = await getDoc(sessionRef);
      let scenarioId = '';
      if (sessionSnap.exists()) {
        scenarioId = sessionSnap.data().scenarioId;

        console.log('getting sceneario');

        // Check if the session has started/ended
        if (sessionSnap.data().started) {
          console.log('session has already started');
          setGameStatus('started');
        } else if (!sessionSnap.data().started && localStorage.getItem('hasStarted') == 'true') {
          setGameStatus('ended');
          localStorage.getItem('hasStarted') == 'false'
        } else {
          setGameStatus('waiting');
        }
      } else if (localStorage.getItem('hasStarted') == 'true') {
        localStorage.getItem('hasStarted') == 'false'
        setGameStatus('ended');
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

  async function removeFromTeam() {
    if (!currentUser) return;
  
    const teamsQuery = query(
      collection(db, "teams"),
      where("memberIds", "array-contains", currentUser.uid)
    );
  
    const querySnapshot = await getDocs(teamsQuery);
  
    if (!querySnapshot.empty) {
      const teamDoc = querySnapshot.docs[0];
      const teamRef = doc(db, "teams", teamDoc.id);
  
      await updateDoc(teamRef, {
        memberIds: arrayRemove(currentUser.uid),
      });
  
      console.log("Successfully removed from team:", teamDoc.id);
    } else {
      console.log("User is not currently in a team.");
    }
  }

  // Find the team associated with the given user id
  async function findTeam(uid: string) {
    // Check if the teamId has already been set, if so return
    if (teamId) {
      return;
    }
    try {
      const teamsRef = collection(db, 'teams');
      const q = query(teamsRef, where('memberIds', 'array-contains', uid));

      // Populate the teamId and Players hooks
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach(doc => {
        const teamID = doc.data().id;
        setTeamId(teamID);
        setTeam(doc.data());
      });
    } catch (error) {
      console.log('Failed', error);
    }
  }


  useEffect(() => {
    const updateTeams = async () => {
      if (currentUser) {
        try {
          const teamsRef = collection(db, 'teams');
          const teamsSnap = await getDocs(teamsRef);

          const userId = currentUser.uid;

          for (const teamDoc of teamsSnap.docs) {
            const teamData = teamDoc.data();

            if (
              Array.isArray(teamData.memberIds) &&
              teamData.memberIds.includes(userId)
            ) {
              console.log(`User found in team: ${teamData.name}`);
              setgameId(teamDoc.id);
              return;
            }
          }

          console.warn('User not found in any team');
          setgameId(null);
        } catch (error) {
          console.error('Error fetching teams:', error);
          setgameId(null);
        }
      } else {
        setgameId(null);
      }
    };
    updateTeams();
  }, [currentUser, db]);

  // Populate the players hook with map (uid, firestore player doc)
  async function getPlayers() {
    if (players.size != 0) {
      return;
    }
    const teamMembers = team.memberIds;
    teamMembers.forEach((memberId: string, index: number) => {
      const userObj = getUser(memberId);
      userObj.then((value: any) => {
        players.set(memberId, value);
        setPlayers(new Map(players));
      });
    });
  }

  // Get the document object associated with given uid
  async function getUser(uid: any) {
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

  // CHeck if the currently signed in user is sessions admin (host)
  // This will probably get changed to check if the user is the team leader rather than session admin
  async function checkHost() {
    // If the team hook is not set, do nothing
    if (!team) {
      return;
    }

    // Get the admin uid of the session
    const sessionId = team.sessionId;
    const docRef = doc(db, 'sessions', sessionId);
    const docSnap = await getDoc(docRef);
    let adminUid = '';
    if (docSnap.exists()) {
      adminUid = docSnap.data().adminUid;
    } else {
      console.log("couldn't find admin");
      return;
    }

    console.log(adminUid);

    // Determine if the current user is admin
    if (currentUser && currentUser.uid == adminUid) {
      console.log('this user is admin');
      setIsHost(true);
    }
  }

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handlePushShell = async () => {
    try {
      router.push('/shell');
    } catch (error) {
      console.error('Shell push failed:', error);
    }
  };

  const handlePushTraffic = async () => {
    try {
      router.push('/network-traffic');
    } catch (error) {
      console.error('Network push failed:', error);
    }
  };

  const handleLeaveLobby = () => {
    removeFromTeam();
    router.push('/dashboard');
  };

  const handleKicked = async () => {
    setIsKicked(true);
    await delay(3000);
    router.push("/dashboard");
  }

  const handleStartGame = async () => {
    setGameStatus('starting');
    await delay(3000);
    setGameStatus('started');
    localStorage.setItem('hasStarted', 'true');
    handlePushShell();
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // Populate the team hook and check if user is host
  useEffect(() => {
    if (currentUser) {
      findTeam(currentUser.uid);
      if (team) {
        getPlayers();
        getScenario();
      }
      checkHost();
    }
  }, [currentUser, team]);

  // Monitor if the session has started (only in waiting state)
  useEffect(() => {
    if (!team) {
      return;
    }

    const sessionRef = doc(db, 'sessions', team.sessionId);
    const unsubscribe = onSnapshot(sessionRef, sessionDoc => {
      if (!sessionDoc.exists()) {
        return;
      }
      const session = sessionDoc.data()
      if (session.started && localStorage.getItem('hasStarted') != 'true') {
        handleStartGame();
      }
    });
    return () => {
      unsubscribe();
    };
  }, [team, gameStatus]);

  // checking the memberIds array useEffect
  useEffect(() => {
    if (!team || !currentUser) {
      return;
    }
    const teamRef = doc(db, "teams", team.id);
    const unsubscribe = onSnapshot(teamRef, (teamDoc) => {
      if (!teamDoc.exists()) {
        return;
      }
      players.clear();
      let kick = true;
      let memberIds:string[] = teamDoc.data().memberIds;
      // Refresh each users value in the players map
      memberIds.forEach((id) => {
        const userObj = getUser(id);
          userObj.then((value: any) => {
            players.set(id, value);
            setPlayers(new Map(players));
          });
        // Check if the current user id is in the array
        if (currentUser.uid == id){
          kick = false;
        }
      })
      // If didnt find uid then they have been kicked
      if (kick) {
        handleKicked();
      }
    });
    return () => {
      unsubscribe;
    };
  }, [team, currentUser]);

  // ------------- End useEffects ---------------

  return (
    <>
      {
        gameStatus == 'ended' && team &&
        <GameEndPopup {...{
            isVisible: true,
            isAdmin: false,
            onClose: () => {
              localStorage.setItem('hasStarted', 'false');
            },
            sessionId: team.sessionId,
            }}>
        </GameEndPopup>
      }
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
                <div className="text-sm text-gray-400">Team:</div>
                <div className="font-semibold text-blue-400">
                  {team?.name || '—'}
                </div>
              </li>
              <li>
                <div className="text-sm text-gray-400">Team ID:</div>
                <div className="font-semibold text-blue-400">{gameId}</div>
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
                        : gameStatus === 'ended'
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
          <header className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold">Session Lobby</h1>
            <div className="flex gap-4">
              <button
                className="px-4 py-2 bg-gray-600 rounded-xl hover:opacity-90 transition font-bold"
                onClick={handleLeaveLobby}
              >
                Leave Lobby
              </button>
              <button
                className="px-4 py-2 bg-blue-600 rounded-xl hover:opacity-90 transition font-bold"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </header>

          {isKicked && (
            <div className="my-4 p-3 bg-red-900/30 border border-red-500 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-red-400 border-t-transparent rounded-full"></div>
                <span className="text-red-400 font-semibold">You have been kicked ...</span>
              </div>
            </div>
          )}

          {/* Lobby Content */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Scenario */}
            <div className="flex flex-col p-5 gap-5 bg-[#1e1e1e] rounded-2xl shadow-md col-span-2">
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
              <h2 className=" text-2xl font-semibold text-green-400 -ml-5">
                {teamId && team.name}
              </h2>
            </div>

            {/* Teams List */}
            {team && (
              <div className="flex flex-col p-5 gap-5 bg-[#1e1e1e] rounded-2xl shadow-md col-span-2">
                <div className="flex flex-row justify-between items-center">
                  <h2 className="text-xl font-semibold ">Team Members</h2>
                </div>

              <div className="flex flex-col gap-5">
                {players.size != 0 &&
                  Array.from(players.values()).map((player) => (
                    <div
                      className="flex items-center justify-between p-3 bg-[#2f2f2f] rounded-lg"
                      key={player.UID}
                    >
                      {/* Player name */}
                        <div>{player.userName}</div>                   
                    </div>
                  ))}
              </div>

                <div className="flex h-full align-bottom items-end">
                  <div className="flex flex-row px-2 pt-3 w-full justify-between border-t">
                    <h2 className="text-l font-semibold text-white">
                      Team ID: {team.id}
                    </h2>
                    {/* <h2 className="text-l font-semibold text-white">Team Members: {value.numMembers}</h2> */}
                  </div>
                </div>
              </div>
            )}
            <button
                className="px-4 py-2 bg-gray-600 rounded-xl hover:opacity-90 transition font-bold"
                onClick={handlePushShell}
              >
                Shell
              </button>
              <button
                className="px-4 py-2 bg-gray-600 rounded-xl hover:opacity-90 transition font-bold"
                onClick={handlePushTraffic}
              >
                Network Traffic
              </button>
          </section>
        </main>
      </div>
    </>
  );
};

export default Lobby;
