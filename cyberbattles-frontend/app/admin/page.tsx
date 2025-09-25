"use client";
import Image from "next/image"
import { IoIosClose } from "react-icons/io";
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
  const [sessionId, setSessionId] = useState(null);
  const [teamId, setTeamId] = useState(null);
  const [players, setPlayers] = useState(new Map());
  const [currentScenario, setCurrentScenario] = useState("");
  const [gameStatus, setGameStatus] = useState("waiting"); // waiting, starting, active

  const [teams, setTeams] = useState(new Map());
  // Get the current user
  const [currentUser, setCurrentUser] = useState<any | null>(null)
    
  
  // TODO: Setup backend call to get player, scenario and teams information


  // Find the teams associated with the session admin id
  async function getTeams(uid: string) {
    // Check if the teamId has already been set, if so return
    if (teams.size != 0) {
      return;
    }
    try{
      const sessionRef = collection(db, "sessions");
      const q =  query(sessionRef, where("adminUid", "==", uid));
      // Get the teamIds array
      let teamIds: string[] = [];
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        setSessionId(doc.data().id);
        teamIds = doc.data().teamIds;
      });

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

    getTeams(currentUser.uid);
    // getTeams("UH8JGh1xF8TWitzReDtBfUkDkcz1");
    getPlayers();

  }

  // Start the session
  async function startSession() {
    // Send the api request
    try {
      const response = await ApiClient.post("/start-session");
      console.log(response.data);
    } catch (error) {
      console.error("Error starting session:", error);
    }
  };

  // Cleanup the session
  async function cleanupSession() {

    // Create the api request url
    const token = await currentUser.getIdToken(true);
    let request = "/cleanup/" + sessionId + "/" + token;
    try {
      const response = await ApiClient.get(request);
      // console.log(response.data);
    } catch (error) {
      console.error("Error cleaning session:", error);
    }
  };

// ---- Handlers ---- //

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/login");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleLeaveLobby = () => {
    router.push("/dashboard");
  };

  const handleStartGame = () => {
    // If not currently admin of a session, do nothing
    if (!sessionId || !currentUser) {
      console.log("No current admin user or session")
      return;
    }
    setGameStatus("starting")
    startSession();
    setGameStatus("started")
    
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

  // Set the teams and players hooks
  useEffect(() => {

      // Populate the team hook and check if user is host
      if (currentUser) {
        getTeams(currentUser.uid);
        // getTeams("UH8JGh1xF8TWitzReDtBfUkDkcz1");
        getPlayers();
      }

  }, [currentUser, teams])

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
                <div className="text-sm text-gray-400">Teams:</div>
                <div className="font-semibold text-green-400">
                  {
                    teams.values().map((value) => (
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

          {/* Lobby Content */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Current Scenario */}
            <div className="p-6 bg-[#1e1e1e] rounded-2xl shadow-md lg:col-span-2">
              <h2 className="text-xl font-semibold mb-4 text-blue-400">Current Scenario</h2>
              <p className="text-gray-300 leading-relaxed">
                {currentScenario}
              </p>
              {gameStatus === "starting" && (
                <div className="mt-4 p-3 bg-blue-900/30 border border-blue-500 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full"></div>
                    <span className="text-blue-400 font-semibold">Game starting in 3 seconds...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Teams */}
            <div className="p-6 rounded-2xl lg:col-span-2 ">
              <h2 className="text-2xl font-semibold">Teams</h2>
            </div>
            

            {/* Teams List */}
            {
              teams.values().map((value) => (

                <div className="flex flex-col p-5 gap-5 bg-[#1e1e1e] rounded-2xl shadow-md">

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
                    <div className="flex flex-row px-2 w-full justify-between">
                      <h2 className="text-l font-semibold text-white">Team ID: {value.id}</h2>
                      {/* <h2 className="text-l font-semibold text-white">Team Members: {value.numMembers}</h2> */}
                    </div>
                  </div>
                </div>
              ))
            }
            
            {/* Game Controls */}
            <div className="p-6 rounded-2xl  lg:col-span-2">
              <h2 className="text-2xl font-semibold">Game Controls</h2>
            </div>


            <div className="p-6 bg-[#1e1e1e] rounded-2xl shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-white">Host Controls</h2>
              <div className="space-y-3 gap-5">
                { (
                <div className="space-y-4">
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



            <div className="p-6 bg-[#1e1e1e] rounded-2xl shadow-md">
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