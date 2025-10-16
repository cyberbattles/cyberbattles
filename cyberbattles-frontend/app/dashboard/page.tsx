'use client';
import React, {useEffect, useState} from 'react';
import {auth, db} from '@/lib/firebase';
import {signOut} from 'firebase/auth';
import {FaRegCopy} from 'react-icons/fa';
import {
  doc,
  updateDoc,
  collection,
  where,
  query,
  getDocs,
  arrayRemove,
} from 'firebase/firestore';
import {useRouter} from 'next/navigation';
import {useAuth} from '@/components/Auth';

const Dashboard = () => {
  const router = useRouter();
  const [jwt, setJwt] = useState('');
  const [showJwt, setShowJwt] = useState(false);

  // For clan
  const {currentUser} = useAuth();
  const [userClan, setUserClan] = useState<any>(null);
  const [gameteamId, setgameteamId] = useState<any>(null);
  const [clanLoading, setClanLoading] = useState(true);
  const [leaveMessage, setLeaveMessage] = useState({type: '', text: ''});
  const [uid, setUid] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [currentUsername, setcurrentUsername] = useState('User');

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

  const handleCopy = async () => {
    if (gameteamId) {
      try {
        await navigator.clipboard.writeText(gameteamId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('Failed to copy Game ID:', error);
      }
    }
  };

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

  useEffect(() => {
    const updateGameId = async () => {
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
              setgameteamId(teamDoc.id);
              return;
            }
          }

          console.warn('User not found in any team');
          setgameteamId(null);
        } catch (error) {
          console.error('Error fetching teams:', error);
          setgameteamId(null);
        }
      } else {
        setgameteamId(null);
      }
    };
    updateGameId();
  }, [auth, db]);

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

  return (
    <>
      {/* Fixed Navbar */}

      {/* Dashboard Layout */}
      <div className="flex h-screen pt-40 bg-[#2f2f2f] text-white">
        {/* Sidebar */}
        <aside className="w-64 bg-[#1e1e1e] shadow-md">
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
        <main className="flex-1 p-8 overflow-auto">
          {/* Header */}
          <header className="flex justify-between items-center mb-8">
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
              {gameteamId && (
                <div>
                  <h3 className="text-lg font-semibold mb-2">
                    <br />
                    Current Team ID
                  </h3>
                  <div className="bg-[#2f2f2f] p-4 rounded-xl mb-4 w-full max-w-[220px]">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-l font-bold text-green-600">
                          {gameteamId}
                        </h4>
                      </div>

                      {gameteamId && (
                        <button
                          onClick={handleCopy}
                          className="text-gray-300 hover:text-white transition-colors"
                          title="Copy Game ID"
                        >
                          <FaRegCopy />
                        </button>
                      )}
                    </div>

                    {copied && (
                      <p className="text-sm text-green-400 mt-2">
                        Copied to clipboard!
                      </p>
                    )}
                  </div>
                </div>
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
