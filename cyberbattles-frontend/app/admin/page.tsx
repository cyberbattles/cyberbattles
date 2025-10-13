"use client";
import Image from "next/image"
import { IoIosClose, IoIosRefresh } from "react-icons/io";
import React, { useState, useEffect, ReactNode } from "react";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { collection, query, where, doc, getDoc, getDocs, updateDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import ApiClient from "@/components/ApiClient";


const Admin = () => {
  const router = useRouter();
  const [sessionIds, setSessionIds] = useState<string[]>([]);
  const [sessionId, setSessionId] = useState("");
  const [teamId, setTeamId] = useState(null);
  const [players, setPlayers] = useState(new Map());
  const [currentScenario, setCurrentScenario] = useState<any | null>(null);
  const [gameStatus, setGameStatus] = useState("waiting"); // waiting, starting, active

  const [teams, setTeams] = useState(new Map());
  // Get the current user
  const [currentUser, setCurrentUser] = useState<any | null>(null)
    
  
  // TODO: Setup backend call to get player, scenario and teams information

  async function getSessions(uid: string) {
    try {
      const sessionRef = collection(db, "sessions");
      const q =  query(sessionRef, where("adminUid", "==", uid));

      // Iterate through the sessions and add all ids to the array
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        let newId = doc.data().id;
        let newSessionIds: string[] = sessionIds;
        
        // Only add the sessionId if its not in the array already
        if (!sessionIds.find((id) => id == newId)){
          newSessionIds.push(newId)
          setSessionIds(newSessionIds);
        }
      });

      // If sessions were found, set the current to be the first
      if (sessionIds.length != 0) {
        setSessionId(sessionIds[0]);
      }
      
    } catch (error) {
      console.log("Failed", error);
    }
  }

  // Find the teams associated with the session admin id
  async function getTeams() {

    if (teams.size != 0){
      return;
    }

    // If sessionId is not set then do nothing
    if(sessionId == ""){
      return;
    }

    try{

      // Get the teamIds array
      let teamIds: string[] = [];
      const sessionRef = doc(db, "sessions", sessionId);
      const sessionSnap = await getDoc(sessionRef);
      if (sessionSnap.exists()){
        teamIds = sessionSnap.data().teamIds;
        if (sessionSnap.data().started) {
          setGameStatus("started");
        } else {
          setGameStatus("waiting")
        }
      };

      teamIds.forEach((teamId) => {
        addTeam(teamId);
      });

    } catch (error) {
      console.log("Failed", error);
    }
  }

  // Helper function for adding teams to the teams state
  async function addTeam(tid: string) {
    try {
      const docRef = doc(db, "teams", tid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        let teamObj = docSnap.data();
        teams.set(tid, teamObj);
        setTeams(new Map(teams));
      }
    } catch (error) {
      console.log("Couldn't find team", error);
    }

  }

  // Populate the players hook with map (uid, player doc)
  async function getPlayers() {
    teams.forEach(async (team, tid) => {

      // Find the player doc and add (pid, player doc) to the players map
      let playerArr = team.memberIds;
      playerArr.forEach((pid: string) => {
        getUser(pid).then((value) => {
          if (!players.has(pid)){
            players.set(pid, value);
            setPlayers(new Map(players));          }
        }).catch((error) => {
          console.log("Unable to find player", error);
        });
      });

      // console.log(tid, playerMap);

    });
  }

  // Get the document object associated with given uid
  async function getUser(uid: any) {
    let ret = null;
    try{
      const docRef = doc(db, "login", uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        ret = docSnap.data();
      }
    } catch (error) {
      console.log("Failed", error);
    }
    return ret;
  }

  // FUNC: Remove a player
  const removePlayer = async (tid: string, uid: string) => {

    // Create a new members array without the given uid
    let newMembers: string[] = [];
    teams.get(tid).memberIds.forEach((value: string) => {
      if (value != uid){
        newMembers.push(value);
      }
    })

    // Update the memberids field in the team document on firestore

    // Get the team document
    const docRef = doc(db, "teams", tid);

    // Update the team document
    await updateDoc(docRef, {
      memberIds:newMembers
    }).then(() => {
      console.log("Team doc successfully updated");
    }).catch((error: any) => {
      console.error("Error updating document: ", error)
    })

    // Reinitialise the use state hooks to remove member *** CHANGE THIS ***

    setTeams(new Map());
    setPlayers(new Map());

    getTeams();
    getPlayers();

  }

  // FUNC: Refresh the teams
  const refreshTeams = async () => {

    // Reinitialise the use state hooks to remove member

    setTeams(new Map());
    setPlayers(new Map());

    getTeams();
    getPlayers();

  }

  // Get the current scenario information
  async function getScenario() {
    // Check if the sessionId has been set, if not return
    if (sessionId == "") {
      return;
    }
    try{
      // Find the session doc
      const sessionRef = doc(db, "sessions", sessionId);
      const sessionSnap = await getDoc(sessionRef);
      let scenarioId = ""
      if (sessionSnap.exists()) {
        scenarioId = sessionSnap.data().scenarioId;
      }
      
      // Find the scenario doc
      const scenearioRef = doc(db, "scenarios", scenarioId);
      const scenarioSnap = await getDoc(scenearioRef);
      if (scenarioSnap.exists()) {
        setCurrentScenario(scenarioSnap.data())
      }

    } catch (error) {
      console.log("Failed", error);
    }
  }

// ---- API Callers ---- //

  // Start the session
  async function startSession() {
    // Send the api request
    try {
      const token = await currentUser.getIdToken(true);
      const response = await ApiClient.post("/start-session", {
        sessionId: sessionId,
        token: token,
      });
      return true;
    } catch (error) {
      console.error("Error starting session:", error);
      return false;
    }
  };

  // Cleanup the session
  async function cleanupSession() {

    // Create the api request url
    const token = await currentUser.getIdToken(true);
    let request = "/cleanup/" + sessionId + "/" + token;
    try {
      const response = await ApiClient.get(request);
      return true;
    } catch (error) {
      console.error("Error cleaning session:", error);
      return false;
    }
  };


// ---- End API Callers ---- //

// ---- Handlers ---- //

  const handleChangeSession = async (sid: string) => {
    setTeams(new Map());
    setPlayers(new Map());
    setSessionId(sid);
  };

  const handleStartGame = async () => {
    // If not currently admin of a session, do nothing
    if (!sessionId || !currentUser) {
      console.log("No current admin user or session")
      return;
    }
    setGameStatus("starting")
    await startSession().then((value) => {
      if (value) {
        setGameStatus("started");
      } else {
        // Tell the user that something went wrong +++
        setGameStatus("waiting")
      }
    })
  };

   const handleEndGame = async () => {
    // If not currently admin of a session, do nothing
    if (!sessionId || !currentUser) {
      console.log("No current admin user or session")
      return;
    }
    setGameStatus("ending");
    await cleanupSession();
    setGameStatus("waiting");
    window.location.reload()
  };

  // ---- End Handlers ---- //

  // ---- useEffects ---- //

  // Set the current logged in user on initial render
  useEffect(() => {

      // Get the currentUser
      const unsubscribe = onAuthStateChanged(auth, user => {
        if (user && !currentUser) {
          setCurrentUser(user);
        }
      });

      return () => {
        unsubscribe;
      };
    },[]);

  // Set the teams, players, and scenario hooks
  useEffect(() => {
      // Populate the team hook and check if user is host
      if (currentUser) {
        if (sessionId == ""){
          getSessions(currentUser.uid);
        }
        getTeams();
        getPlayers();
        getScenario();
      }

  }, [currentUser, teams, sessionId])

  // ---- End useEffects ---- //
  
  return (
    <>
      {/* Fixed Navbar */}
      <Navbar />

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
                  {
                    Array.from(teams.values()).map((value) => (
                      <h1 key={value.id}>{value.name}</h1>
                    ))
                  }
                </div>
              </li>
              <li>
                <div className="text-sm text-gray-400">Players:</div>
                <div className="font-semibold">{0 || players.size}</div>
              </li>
              <li>
                <div className="text-sm text-gray-400">Status:</div>
                <div className={`font-semibold capitalize ${
                  gameStatus === "waiting" ? "text-yellow-400" :
                  gameStatus === "starting" ? "text-blue-400" :
                  gameStatus === "ending" ? "text-red-400" :
                  "text-green-400"
                }`}>
                  {gameStatus === "starting" ? "Starting..." : gameStatus}
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
              {
                sessionIds.map((id) => (
                  <button
                    className={`px-4 py-2 rounded-xl hover:opacity-90 transition font-bold ${
                        id === sessionId ? "bg-gray-600 " :
                        "bg-[#1e1e1e]"
                      }`}
                    onClick={() => handleChangeSession(id)}
                    key={id}
                  >{id}
                  </button>
                ))
              }
              
            </ul>
            {/* <div className="flex gap-4">
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
            </div> */}
          </header>

          {/* Lobby Content */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Scenario */}
            <div className="flex flex-col p-5 gap-5 bg-[#1e1e1e] rounded-2xl shadow-md col-span-2 lg:col-span-1">
              <h2 className="text-xl font-semibold mb-4 border-b text-blue-400">Current Scenario</h2>
              {
                currentScenario && (
                  <div className="flex flex-col gap-2 text-l text-white">
                    <p>{currentScenario.scenario_title}</p>
                    <p>{currentScenario.scenario_description}</p>
                    <div className="flex gap-10 font-semibold">
                      <p>
                        Scenario difficulty: 
                      </p>
                      <p>
                        {currentScenario.scenario_difficulty}
                      </p>
                    </div>
                  </div>
                )
              }
              {gameStatus === "starting" && (
                <div className="mt-4 p-3 bg-blue-900/30 border border-blue-500 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                    <span className="text-blue-400 font-semibold">Game starting...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Timer */}
            <div className="flex flex-col p-5 bg-[#1e1e1e] rounded-2xl shadow-md col-span-2 lg:col-span-1">
              <h2 className="text-xl font-semibold mb-4 border-b text-blue-400">Time Remaining</h2>
              {
                gameStatus == "started" && (
                  <div className="flex text-3xl items-center align-middle justify-center  h-full">
                    time
                  </div>
                )
              }
            </div>

            {/* Teams */}
            <div className="p-6 rounded-2xl col-span-2 ">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-semibold">Teams</h2>
                <div className="" onClick={() => refreshTeams()}>
                  <IoIosRefresh size={20}/>
                </div>
              </div>
            </div>
            

            {/* Teams List */}
            {
              Array.from(teams.values()).map((value) => (

                <div className="flex flex-col p-5 gap-5 bg-[#1e1e1e] rounded-2xl shadow-md col-span-2 lg:col-span-1" key={value.id}>

                  <div className="flex flex-row justify-between items-center">
                    <h2 className="text-xl font-semibold text-green-400">{value.name}</h2>
                  </div>

                  <div className="flex flex-col gap-5">
                    {
                      value.memberIds.map((uid: string) => (
                        <div className="flex items-center justify-between p-3 bg-[#2f2f2f] rounded-lg" key={uid}>
                          <div>{players && players.get(uid) && players.get(uid).userName}</div>
                          <div className="" onClick={() => removePlayer(value.id, uid)}>
                             <IoIosClose size={30}/>
                           </div>
                        </div>
                      ))
                    }
                  </div>

                  <div className="flex h-full align-bottom items-end">
                    <div className="flex flex-row px-2 pt-3 w-full justify-between border-t">
                      <h2 className="text-l font-semibold text-white">Team ID: {value.id}</h2>
                      {/* <h2 className="text-l font-semibold text-white">Team Members: {value.numMembers}</h2> */}
                    </div>
                  </div>
                </div>
              ))
            }
            
            {/* Game Controls */}
            <div className="p-6 rounded-2xl lg:col-span-2">
              <h2 className="text-2xl font-semibold">Game Controls</h2>
            </div>


            <div className="p-6 bg-[#1e1e1e] rounded-2xl shadow-md col-span-2 lg:col-span-1">
              <h2 className="text-xl font-semibold mb-4 text-white">Host Controls</h2>
              <div className="space-y-3 gap-5">
                { (
                <div className="space-y-4">
                  { (gameStatus === "waiting" || gameStatus==="starting") &&
                  <div className="p-3 bg-[#2f2f2f] rounded-lg">
                    <div className="text-sm text-gray-400 mb-5">Begin Session</div>
                    <button
                      onClick={handleStartGame}
                      disabled={gameStatus === "starting"}
                      className={`w-full px-4 py-3 rounded-xl font-bold transition ${
                        gameStatus !== "starting"
                          ? "bg-green-600 hover:opacity-90"
                          : "bg-gray-600 cursor-not-allowed opacity-50"
                      }`}
                    >
                      {gameStatus === "starting" ? "Starting Game..." : "Start Game"}
                    </button>
                    
                   
                  </div>
                  }
                  <div className="p-3 bg-[#2f2f2f] rounded-lg">
                    <div className="text-sm text-gray-400 mb-5">Cleanup Session</div>
                    <button
                      onClick={handleEndGame}
                      disabled={gameStatus === "ending"}
                      className={`w-full px-4 py-3 rounded-xl font-bold transition ${
                        gameStatus !== "ending"
                          ? "bg-red-600 hover:opacity-90"
                          : "bg-gray-600 cursor-not-allowed opacity-50"
                      }`}
                    >
                      {gameStatus === "ending" ? "Cleaning up..." : "Cleanup Session"}
                    </button>
                    
                   
                  </div>
                </div>
              )}
              </div>
            </div>



            <div className="p-6 bg-[#1e1e1e] rounded-2xl shadow-md col-span-2 lg:col-span-1">
              <h2 className="text-xl font-semibold mb-4 text-white">Session Info</h2>
              <div className="space-y-3 gap-5">
                <div className="space-y-4">
                  <div className="mt-4 p-3 bg-[#2f2f2f] rounded-lg">
                    <div className="text-sm text-gray-400 mb-2">Scenario Info</div>
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