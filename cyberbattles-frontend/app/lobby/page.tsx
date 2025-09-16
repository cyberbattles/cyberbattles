"use client";
import Image from "next/image"
import close from "@/public/images/close_icon.png"
import React, { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { collection, query, where, doc, getDoc, getDocs, updateDoc } from "firebase/firestore";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import ApiClient from "@/components/ApiClient";


const Lobby = () => {
  const router = useRouter();
  const [teamId, setTeamId] = useState(null);
  const [players, setPlayers] = useState(new Map());
  const [currentScenario, setCurrentScenario] = useState("");
  const [gameStatus, setGameStatus] = useState("waiting"); // waiting, starting, active
  const [isHost, setIsHost] = useState(false);

  const [team, setTeam] = useState<any>(null);
  // Get the current user
  const [currentUser, setCurrentUser] = useState<any | null>(null)
    
  
  // TODO: Setup backend call to get player, scenario and teams information


  // Find the team associated with the given user id
  async function findTeam(uid: string) {
    // Check if the teamId has already been set, if so return
    if (teamId) {
      return;
    }
    try{
      const teamsRef = collection(db, "teams");
      const q =  query(teamsRef, where("memberIds", "array-contains", uid));

      // Populate the teamId and Players hooks
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((doc) => {
        const teamID = doc.data().id;
        setTeamId(teamID);
        setTeam(doc.data());
      })

    } catch (error) {
      console.log("Failed", error);
    }
  }

  // Populate the players hook with map (uid, firestore player doc)
  async function getPlayers() {
    if (players.size != 0) {
      return;
    }
    const teamMembers = team.memberIds;
    teamMembers.forEach((memberId: string, index: number) => {
      let userObj = getUser(memberId);
      userObj.then((value: any) => {
        players.set(memberId, value)
        setPlayers(new Map(players));
      })
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

  // CHeck if the currently signed in user is sessions admin (host)
  // This will probably get changed to check if the user is the team leader rather than session admin
  async function checkHost() {
    // If the team hook is not set, do nothing
    if (!team) {
      return;
    }

    // Get the admin uid of the session
    const sessionId = team.sessionId;
    let docRef = doc(db, "sessions", sessionId);
    let docSnap = await getDoc(docRef);
    let adminUid = ""
    if (docSnap.exists()) {
      adminUid = docSnap.data().adminUid;
    } else {
      console.log("couldn't find admin");
      return;
    }

    console.log(adminUid)

    // Determine if the current user is admin
    if (currentUser.uid == adminUid){
      console.log("this user is admin");
      setIsHost(true);
    }
    // setIsHost(true);
  }

  const removePlayer = async (uid: string) => {

    if(!teamId){
      return;
    }
    console.log(uid);

    // Create a new members array without the given uid

    let newMembers: string[] = [];
    team.memberIds.forEach((value: string) => {
      if (value != uid){
        newMembers.push(value);
      }
    })

    // Update the memberids field in the team document on firestore

    // Get the team document
    let docRef = doc(db, "teams", teamId);
    // Update the team document
    await updateDoc(docRef, {
      memberIds:newMembers
    }).then(() => {
      console.log("Team doc successfully updated");
    }).catch((error: any) => {
      console.error("Error updating document: ", error)
    })

    // Update the use state hooks to remove member

    players.delete(uid);
    setPlayers(new Map(players));

    docRef = doc(db, "teams", teamId);
    // Populate the teamId and Players hooks
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()){
      setTeamId(docSnap.data().teamId);
      setTeam(docSnap.data());
    }
  }

   async function startSession() {
        try {
            const response = await ApiClient.post("/start-session");
            return response.data;
        } catch (error) {
            console.error("Error starting session:", error);
        }
    }

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

  };



  // --------------------------------------

  // Get the auth state and set the current user
  try{
      onAuthStateChanged(auth, (user) => {
          if (user && !currentUser){
            setCurrentUser(user);
          }
      })
      
    }  catch (error) {
      setCurrentUser(null);
      console.error("Failed:", error);
    }

  // Get the team information and players list from firebase
  if (currentUser) {
      findTeam(currentUser.uid);
    if (team) {
      getPlayers();
    }
    checkHost();
  }

  return (
    <>
      {/* Fixed Navbar */}
      <Navbar />

      {/* Lobby Layout */}
      <div className="flex h-screen pt-40 bg-[#2f2f2f] text-white">
        {/* Sidebar */}
        <aside className="w-64 bg-[#1e1e1e] shadow-md">
          <div className="p-6 text-xl font-bold border-b border-gray-700">
            Game Lobby
          </div>
          <nav className="p-6">
            <ul className="space-y-4">
              <li>
                <div className="text-sm text-gray-400">Team:</div>
                <div className="font-semibold text-blue-400">{teamId && team.name}</div>
              </li>
              <li>
                <div className="text-sm text-gray-400">Players:</div>
                <div className="font-semibold">{players.size}/5</div>
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
            <h1 className="text-2xl font-bold">Game Lobby</h1>
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

            {/* Players List */}
            <div className="p-6 bg-[#1e1e1e] rounded-2xl shadow-md">
              <h2 className="text-xl font-semibold mb-4 text-green-400">Players</h2>
              <div className="space-y-3">
                {
                  (players.size != 0) && (team.memberIds.map((uid: string) => (

                  <div className="flex items-center justify-between p-3 bg-[#2f2f2f] rounded-lg" key={uid}>
                    {/* Player name */}
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{players.get(uid) && players.get(uid).userName}</span>
                    </div>
                    {/* Remove player button */}
                    {
                      isHost &&
                      <div className="" onClick={() => removePlayer(uid)}>
                        <Image src={close} alt="close" width={20} className="invert" />
                      </div>
                    }      
                  </div>
                  )))
                }
              </div>
            </div>

            {/* Game Controls */}
            <div className="p-6 bg-[#1e1e1e] rounded-2xl shadow-md">

              Game Controls
              
              {isHost && (
                <div className="space-y-4">
                  <div className="p-3 bg-[#2f2f2f] rounded-lg">
                    <div className="text-sm text-gray-400 mb-1">Host Controls</div>
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
                </div>
              )}

              <div className="mt-4 p-3 bg-[#2f2f2f] rounded-lg">
                <div className="text-sm text-gray-400 mb-2">Scenario Info</div>
                <div className="text-sm space-y-1">
                  <div>Name: ubuntu - basic</div>
                  <div>Challenges: 5</div>
                  <div>Difficulty: Beginner</div>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </>
  );
};

export default Lobby;