'use client';
import React, {useEffect, useState} from 'react';
import {auth, db} from '@/lib/firebase';
import {onAuthStateChanged, signOut} from 'firebase/auth';
import {FaRegCopy} from 'react-icons/fa';
import {
  doc,
  updateDoc,
  collection,
  where,
  query,
  getDocs,
  arrayRemove,
  onSnapshot,
  getDoc,
} from 'firebase/firestore';
import {useRouter} from 'next/navigation';
import {useAuth} from '@/components/Auth';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';

const Dashboard = () => {
  const router = useRouter();
  const [jwt, setJwt] = useState('');
  const [showJwt, setShowJwt] = useState(false);

  // For clan
  const {currentUser} = useAuth();
  const [userClan, setUserClan] = useState<any>(null);
  const [gameTeamId, setGameTeamId] = useState<string>('');
  const [gameSessionId, setSessionId] = useState<string>('');
  const [clanLoading, setClanLoading] = useState(true);
  const [leaveMessage, setLeaveMessage] = useState({type: '', text: ''});
  const [uid, setUid] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [currentUsername, setcurrentUsername] = useState('User');
  const [gameopponentIp, setgameopponenentIp] = useState<any>(null);
  const [gameteamIp, setgameteamIp] = useState<any>(null);

  function createData(
    teamname: string,
    cyberBattles: string,
    cyberBank: string,
    cyberUni: string,
    cyberFreeRam: string
  ) {
    return { teamname, cyberBattles, cyberBank, cyberUni, cyberFreeRam };
  }

  const rows = [
    createData('CyberNote', '0.0.0.0', '0.0.0.0', '0.0.0.0', '0.0.0.0'),
    createData('CyberBank', '0.0.0.0', '0.0.0.0', '0.0.0.0', '0.0.0.0'),
    createData('CyberUni', '0.0.0.0', '0.0.0.0', '0.0.0.0', '0.0.0.0'),
    createData('CyberFreeRam', '0.0.0.0', '0.0.0.0', '0.0.0.0', '0.0.0.0'),
  ];
  

  useEffect(() => {
    if (currentUser) {
      setUid(currentUser.uid);
      localStorage.setItem('currentuid', currentUser.uid);
    } else {
      setUid(null);
      localStorage.removeItem('currentuid');
    }

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
          } else {
            console.warn('User not found in login collection');
          }
        } catch (error) {
          console.error('Error fetching username:', error);
        }
      } else {
        console.log('No user signed in');
      }
    };

    updateUsername();
  }, [currentUser]);

  useEffect(() => {
    const checkUserClan = async () => {
      if (!uid) {
        setClanLoading(false);
        return;
      }

      try {
        const teamsRef = collection(db, 'clans');
        const q = query(teamsRef, where('memberIds', 'array-contains', uid));
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const clanDoc = querySnapshot.docs[0];
          setUserClan({
            id: clanDoc.id,
            ...clanDoc.data(),
          });
        } else {
          setUserClan(null);
        }
      } catch (error) {
        console.error('Error checking user clan:', error);
        setUserClan(null);
      } finally {
        setClanLoading(false);
      }
    };

    checkUserClan();
  }, [uid]);

  const handleCopy = async (text:string) => {
    if (gameTeamId) {
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy Game ID:', error);
      }
    }
  };


  {/* Use Effect function set up for getting team and opponnent IP*/}
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (currentUser) {
        try {
          const teamsRef = collection(db, "teams");
          const teamsSnap = await getDocs(teamsRef);
          const userId = currentUser.uid;
  
          for (const teamDoc of teamsSnap.docs) {
            const teamData = teamDoc.data();
  
            if (
              Array.isArray(teamData.memberIds) &&
              teamData.memberIds.includes(userId)
            ) {
              const ip = teamData.ipAddress;
              setgameteamIp(ip);
              return;
            }
          }
  
          console.warn("User not found in any team");
          setgameteamIp(null);
        } catch (error) {
          console.error("Error fetching teams:", error);
          setgameteamIp(null);
        }
      } else {
        setgameteamIp(null);
      }
    });
  
    // Cleanup the auth listener when the component unmounts
    return () => unsubscribe();
  }, [auth, db]);

  
  useEffect(() => {
    if (!auth.currentUser || !gameTeamId) return; // wait until both are ready
  
    const fetchOpponentIp = async () => {
      try {
        const sessionRef = collection(db, "sessions");
        const sessionSnap = await getDocs(sessionRef);
        const teamId = gameTeamId;
  
        for (const sessionDoc of sessionSnap.docs) {
          const sessionData = sessionDoc.data();
  
          if (sessionData.teamIds.includes(teamId) && sessionData.started) {
            const opponentTeamId = sessionData.teamIds.find((id: any) => id !== teamId);
  
            const opponentTeamRef = doc(db, "teams", opponentTeamId);
            const opponentTeamSnap = await getDoc(opponentTeamRef);
  
            if (opponentTeamSnap.exists()) {
              const opponentData = opponentTeamSnap.data();
              setgameopponenentIp(opponentData.ipAddress ?? null);
              return;
            }
          }
        }
  
        setgameopponenentIp(null);
      } catch (error) {
        console.error("Error fetching opponent IP:", error);
        setgameopponenentIp(null);
      }
    };
  
    fetchOpponentIp();
  }, [auth.currentUser, gameTeamId]); 

  const handleLeaveClan = async () => {
    if (!currentUser || !userClan) return;

    try {
      const clanRef = doc(db, 'clans', userClan.id);

      // Remove user from memberIds array
      await updateDoc(clanRef, {
        memberIds: arrayRemove(uid),
      });

      // Update local state
      setUserClan(null);
      setLeaveMessage({
        type: 'success',
        text: 'Successfully left the clan!',
      });

      // Clear message after 3 seconds
      setTimeout(() => {
        setLeaveMessage({type: '', text: ''});
      }, 3000);
    } catch (error) {
      console.error('Error leaving clan:', error);
      setLeaveMessage({
        type: 'error',
        text: 'Failed to leave clan. Please try again.',
      });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleGetJwt = async () => {
    if (currentUser) {
      try {
        const token = await currentUser.getIdToken(true);
        setJwt(token);
        localStorage.setItem('token', jwt);
        setShowJwt(true);
      } catch (error) {
        console.error('Failed to get JWT:', error);
        setJwt('Could not retrieve token.');
        setShowJwt(true);
      }
    } else {
      console.error('No user is signed in.');
    }
  };
  {/* Download Config Function */}
  {/* https://stackoverflow.com/questions/50694881/how-to-download-file-in-react-js */}
  const handleDownloadConfig = async () => {
    if (!currentUser) {
      console.error("User not signed in.");
      return;
    }
  
    try {
      const token = await currentUser.getIdToken();
      const sessionId = gameSessionId;
      const teamId = gameTeamId;
      const userId = uid;
  
      if (!sessionId || !teamId || !userId) {
        console.error("Missing required IDs for config download.");
        return;
      }
  
      const url = `https://cyberbattl.es/api/config/${sessionId}/${teamId}/${userId}/${token}`;
  
      const response = await fetch(url, { method: "GET" });
  
      if (!response.ok) {
        console.error(`Failed to fetch config file: ${response.status}`);
        return;
      }
  
      const data = await response.json();
      const configText = data.config;
  
      // Create a Blob so the browser can download it
      const blob = new Blob([configText], { type: "text/plain" });
      const blobUrl = window.URL.createObjectURL(blob);
  
      // Create a hidden <a> element to trigger the download
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `${data.username || "vpn-config"}.conf`;
      document.body.appendChild(a);
      a.click();
  
      // Cleanup
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
  
      console.log("Config downloaded successfully!");
    } catch (error) {
      console.error("Error downloading config:", error);
    }
  };
  

  // Listen for changes to the user's team document
  useEffect(() => {
    if (!currentUser) {
      return;
    }

    const teamsQuery = query(
      collection(db, 'teams'),
      where('memberIds', 'array-contains', currentUser.uid),
    );

    const unsubscribe = onSnapshot(teamsQuery, querySnapshot => {
      if (!querySnapshot.empty) {
        const teamDoc = querySnapshot.docs[0];
        console.log("User's team updated:", teamDoc.id);
        setGameTeamId(teamDoc.id);
      } else {
        console.log('User is not currently in a team.');
        setGameTeamId('');
      }
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser]);

  useEffect(() => {
    const sessionQuery = query(
      collection(db, 'sessions'),
      where('teamIds', 'array-contains', gameTeamId),
    );

    const unsubscribe = onSnapshot(sessionQuery, querySnapshot => {
      if (!querySnapshot.empty) {
        const sessionDoc = querySnapshot.docs[0];
        console.log("User's team updated:", sessionDoc.id);
        setSessionId(sessionDoc.id);
      } else {
        console.log('User is not currently in a team.');
        setSessionId('');
      }
    });
  
  return () => unsubscribe();
  }, [gameTeamId]);


  const handleGoToJoin = () => {
    try {
      router.push('/join-team');
    } catch (error) {
      console.error('Navigation failed:', error);
    }
  };

  const handleGoToCreation = () => {
    try {
      router.push('/create-session');
    } catch (error) {
      console.error('Navigation failed:', error);
    }
  };

  const handleGoToClan = () => {
    try {
      router.push('/clan');
    } catch (error) {
      console.error('Navigation failed:', error);
    }
  };

  const handleGoToAdmin = () => {
    try {
      router.push('/admin');
    } catch (error) {
      console.error('Navigation failed:', error);
    }
  };

  const handleGoToLobby = () => {
    try {
      router.push('/lobby');
    } catch (error) {
      console.error('Navigation failed:', error);
    }
  };

  return (
    <>
      {/* Fixed Navbar */}

      {/* Dashboard Layout */}
      <div className="flex flex-col md:flex-row min-h-screen pt-25 sm:pt-40 bg-[#2f2f2f] text-white">
        {/* Sidebar */}
        <aside className="w-full md:w-64 bg-[#1e1e1e] shadow-md flex-shrink-0">
          <div className="p-6 text-xl font-bold border-b border-gray-700">
            Dashboard
          </div>
          <nav className="p-6">
            <ul className="space-y-4">
              <li>
                <a href="#" className="hover:text-blue-400">
                  Overview
                </a>
              </li>
              <li>
                <a href="reports" className="hover:text-blue-400">
                  Game Reports
                </a>
              </li>
              <li>
                <a href="analytics" className="hover:text-blue-400">
                  Analytics
                </a>
              </li>
              <li>
                <a href="account" className="hover:text-blue-400">
                  Account
                </a>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {/* Header */}
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h1 className="text-2xl font-bold">Welcome, {currentUsername}!</h1>
            <div className="flex gap-4">
              <button
                className="px-4 py-2 bg-blue-600 rounded-xl hover:opacity-90 transition font-bold"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </header>

          {/* Dashboard Widgets */}
          <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-6 bg-[#1e1e1e] rounded-2xl shadow-md col-span-1 md:col-span-2 lg:col-span-3">
              {gameTeamId === '' && (
                <>
                  <h3 className="text-lg font-semibold mb-2">
                    Join or Create Game
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={handleGoToJoin}
                      className="px-4 py-2 bg-orange-700 rounded-xl hover:opacity-90 transition font-bold"
                    >
                      Join a Game
                    </button>
                    <button
                      onClick={handleGoToCreation}
                      className="px-4 py-2 bg-blue-600 rounded-xl hover:opacity-90 transition font-bold"
                    >
                      Create a Game
                    </button>
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    <br />
                    Already a session admin?
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      onClick={handleGoToAdmin}
                      className="px-4 py-2 bg-blue-600 rounded-xl hover:opacity-90 transition font-bold"
                    >
                      Game Lobby Information
                    </button>
                  </div>
                </>
              )}
              {gameTeamId !== '' && (
                <div className="space-y-4">
                  {/* Header with CTA */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-gray-700">
                    <h3 className="text-xl font-bold bg-white bg-clip-text text-transparent">
                      Game Details
                    </h3>
                    <button
                      onClick={handleGoToLobby}
                      className="px-4 py-2 bg-blue-600 rounded-xl hover:opacity-90 transition font-bold"
                    >
                      <span className="flex items-center gap-2">
                        Go to Game Lobby
                        <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                      </span>
                    </button>
                  </div>

                  {/* Info Cards Grid */}
                  <div className="grid gap-3">
                    {/* Team ID Card */}
                    <div className="group bg-gradient-to-br from-[#2a2a2a] to-[#252525] p-4 rounded-xl border border-gray-800 hover:border-gray-700 transition-all duration-200">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-400 mb-1">Team ID</p>
                          <p className="text-lg font-mono font-bold text-green-500 truncate">
                            {gameTeamId}
                          </p>
                        </div>
                        <button
                          onClick={() => handleCopy(gameTeamId)}
                          className="flex-shrink-0 p-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all duration-200 hover:scale-110 active:scale-95"
                          title="Copy Team ID"
                        >
                          <FaRegCopy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Team IP Card */}
                    <div className="group bg-gradient-to-br from-[#2a2a2a] to-[#252525] p-4 rounded-xl border border-gray-800 hover:border-gray-700 transition-all duration-200">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-400 mb-1">Team IP Address</p>
                          <p className="text-lg font-mono font-bold text-green-500 truncate">
                            {gameteamIp}
                          </p>
                        </div>
                        <button
                          onClick={() => handleCopy(gameteamIp)}
                          className="flex-shrink-0 p-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all duration-200 hover:scale-110 active:scale-95"
                          title="Copy Team IP"
                        >
                          <FaRegCopy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Opponent IP Card */}
                    <div className="group bg-gradient-to-br from-[#2a2a2a] to-[#252525] p-4 rounded-xl border border-gray-800 hover:border-gray-700 transition-all duration-200">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-400 mb-1">Opponent IP Address</p>
                          <p className="text-lg font-mono font-bold text-green-500 truncate">
                            {gameopponentIp}
                          </p>
                        </div>
                        <button
                          onClick={() => handleCopy(gameopponentIp)}
                          className="flex-shrink-0 p-2.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition-all duration-200 hover:scale-110 active:scale-95"
                          title="Copy Opponent IP"
                        >
                          <FaRegCopy className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            {/* Table for game ips */}
            {gameTeamId !== '' && (
            <TableContainer component={Paper} className="mt-6">
              <Table sx={{ minWidth: 650, backgroundColor: 'black', color: 'white' }} aria-label="Game IP Table">
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#111111' }}>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }}>Team Name</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Team One</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Team Two</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Team Three</TableCell>
                    <TableCell sx={{ color: 'white', fontWeight: 'bold' }} align="right">Team Four</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow
                      key={row.teamname}
                      sx={{ 
                        '&:last-child td, &:last-child th': { border: 0 },
                        backgroundColor: '#2a2a2a', 
                        color: 'white',
                        fontWeight: 'bold',
                      }}
                    >
                      <TableCell component="th" scope="row" sx={{ color: 'white' }}>
                        {row.teamname}
                      </TableCell>
                      <TableCell align="right" sx={{ color: 'white' }}>{row.cyberBattles}</TableCell>
                      <TableCell align="right" sx={{ color: 'white' }}>{row.cyberBank}</TableCell>
                      <TableCell align="right" sx={{ color: 'white' }}>{row.cyberUni}</TableCell>
                      <TableCell align="right" sx={{ color: 'white' }}>{row.cyberFreeRam}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            )}

              
            </div>

            

            {/* JWT Display Widget */}
            <div className="p-6 bg-[#1e1e1e] rounded-2xl shadow-md col-span-1 md:col-span-2 lg:col-span-3">
              <h3 className="text-lg font-semibold mb-2">
                Your JWT (For Testing)
              </h3>
              <button
                onClick={handleGetJwt}
                className="px-4 py-2 bg-green-600 rounded-xl hover:opacity-90 transition font-bold mb-2"
              >
                Click to Reveal
              </button>
              {showJwt && (
                <textarea
                  readOnly
                  className="w-full h-24 p-2 bg-[#2f2f2f] border border-gray-600 rounded-md text-sm break-all"
                  value={jwt}
                />
              )}
               {gameSessionId && (
          <div>
            <h3 className="text-lg font-semibold mb-2 mt-5">
              Download VPN Configuration
            </h3>
            <button
              onClick={handleDownloadConfig}
              className="px-4 py-2 bg-green-600 rounded-xl hover:opacity-90 transition font-bold mb-2"
            >
              Download
            </button>
          </div>
        )}
        </div>
        
            

            {/* Join a clan */}
            <div className="p-6 bg-[#1e1e1e] rounded-2xl shadow-md col-span-1 md:col-span-2 lg:col-span-3">
              {clanLoading ? (
                <div className="text-center">
                  <h3 className="text-lg font-semibold mb-2">Clan Status</h3>
                  <p className="text-gray-400">Loading...</p>
                </div>
              ) : userClan ? (
                // User is in a clan - show clan info and leave button
                <div>
                  <h3 className="text-lg font-semibold mb-4">Your Clan</h3>
                  <div className="bg-[#2f2f2f] p-4 rounded-xl mb-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="text-xl font-bold text-blue-400">
                          [{userClan.clanTag}]
                        </h4>
                        <p className="text-sm text-gray-400">
                          Clan ID: {userClan.clanId}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-400">Members</p>
                        <p className="text-lg font-semibold">
                          {userClan.memberIds?.length || 0}/
                          {userClan.numMembers}
                        </p>
                      </div>
                    </div>
                    {userClan.createdAt && (
                      <p className="text-xs text-gray-500">
                        Created:{' '}
                        {new Date(
                          userClan.createdAt.toDate(),
                        ).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={handleLeaveClan}
                    className="px-4 py-2 bg-red-600 rounded-xl hover:bg-red-700 transition font-bold"
                  >
                    Leave Clan
                  </button>
                  {leaveMessage.text && (
                    <p
                      className={`mt-3 text-sm ${
                        leaveMessage.type === 'success'
                          ? 'text-green-400'
                          : 'text-red-400'
                      }`}
                    >
                      {leaveMessage.text}
                    </p>
                  )}
                </div>
              ) : (
                // User is not in a clan - show join/create button
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    Join or Create a Clan
                  </h3>
                  <button
                    onClick={handleGoToClan}
                    className="px-4 py-2 bg-blue-600 rounded-xl hover:bg-blue-700 transition font-bold mb-2"
                  >
                    Join or Create Clan
                  </button>
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
    </>
  );
};

export default Dashboard;

