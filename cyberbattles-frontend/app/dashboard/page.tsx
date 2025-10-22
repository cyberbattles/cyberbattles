'use client';
import React, {useEffect, useState} from 'react';
import Link from 'next/link';
import {auth, db} from '@/lib/firebase';
import {signOut} from 'firebase/auth';
import {
  doc,
  updateDoc,
  collection,
  where,
  query,
  getDocs,
  arrayRemove,
  onSnapshot,
} from 'firebase/firestore';
import {useRouter} from 'next/navigation';
import {useAuth} from '@/components/Auth';

const Dashboard = () => {
  const router = useRouter();
  const {currentUser} = useAuth();
  const [userClan, setUserClan] = useState<any>(null);
  const [clanLoading, setClanLoading] = useState(true);
  const [leaveMessage, setLeaveMessage] = useState({type: '', text: ''});
  const [uid, setUid] = useState<string | null>(null);
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

  // Redirect if user is administering a game
  useEffect(() => {
    if (!currentUser) return;

    // Listen for sessions where the user is admin
    const sessionQuery = query(
      collection(db, 'sessions'),
      where('adminId', '==', currentUser.uid),
    );

    const unsubscribeSessions = onSnapshot(sessionQuery, querySnapshot => {
      if (!querySnapshot.empty) {
        router.push('/admin');
      }
    });

    return () => unsubscribeSessions();
  }, [currentUser, router]);

  // Redirect if user is in a team
  useEffect(() => {
    if (!currentUser) return;

    // Listen for the user's team
    const teamsQuery = query(
      collection(db, 'teams'),
      where('memberIds', 'array-contains', currentUser.uid),
    );

    const unsubscribeTeams = onSnapshot(teamsQuery, querySnapshot => {
      if (!querySnapshot.empty) {
        router.push('/lobby');
      }
    });

    return () => unsubscribeTeams();
  }, [currentUser, router]);

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

  return (
    <>
      {/* Dashboard Layout */}
      <div className="flex flex-col md:flex-row min-h-screen pt-25 sm:pt-40 bg-[#2f2f2f] text-white">
        {/* Sidebar */}
        <aside className="w-full md:w-72 bg-[#1e1e1e] shadow-2xl flex-shrink-0 border-r border-gray-800">
          <nav className="p-6 pt-8">
            <ul className="space-y-2">
              <li>
                <Link
                  href="/dashboard"
                  className="flex items-center px-4 py-3 rounded-lg bg-blue-600 text-white font-bold transition-all duration-200 hover:bg-blue-500"
                >
                  Overview
                </Link>
              </li>
              <li>
                <Link
                  href="/reports"
                  className="flex items-center px-4 py-3 rounded-lg text-white font-bold transition-all duration-200 hover:bg-gray-800"
                >
                  Game Reports
                </Link>
              </li>
              <li>
                <Link
                  href="/analytics"
                  className="flex items-center px-4 py-3 rounded-lg text-white font-bold transition-all duration-200 hover:bg-gray-800"
                >
                  Analytics
                </Link>
              </li>
              <li>
                <Link
                  href="/account"
                  className="flex items-center px-4 py-3 rounded-lg text-white font-bold transition-all duration-200 hover:bg-gray-800"
                >
                  Account Details
                </Link>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          {/* Header */}
          <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h1 className="text-3xl font-bold">Welcome, {currentUsername}!</h1>
            <div className="flex gap-4">
              <button
                className="px-5 py-2.5 bg-red-600 rounded-lg font-bold text-white transition-all duration-300 hover:bg-red-700 "
                onClick={handleLogout}
              >
                Log Out
              </button>
            </div>
          </header>

          {/* Dashboard Widgets: Full-width stacked */}
          <section className="space-y-6">
            {/* Join or Create Game Banner */}
            <div className="p-8 bg-[#1e1e1e] rounded-2xl shadow-md text-center">
              <h3 className="text-2xl font-bold mb-4 text-gray-100">
                Ready to Play?
              </h3>
              <p className="text-gray-400 mb-8 max-w-lg mx-auto">
                Jump into an active game lobby or launch a new session as an
                admin.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <button
                  onClick={handleGoToJoin}
                  className="px-8 py-3 bg-blue-600 rounded-lg hover:bg-blue-700 transition-all duration-300 font-bold text-white text-center"
                >
                  Join a Game
                </button>
                <button
                  onClick={handleGoToCreation}
                  className="px-8 py-3 bg-red-600 rounded-lg hover:bg-red-700 transition-all duration-300 font-bold text-white text-center"
                >
                  Create a Game
                </button>
              </div>
            </div>

            {/* Join a clan */}
            <div className="p-6 bg-[#1e1e1e] rounded-2xl shadow-md">
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
                  <p className="text-gray-400 mb-4">
                    Team up with other players to compete together.
                  </p>
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
