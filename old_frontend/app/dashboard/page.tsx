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
import {useRouter, useSearchParams} from 'next/navigation';
import {useAuth} from '@/components/Auth';
import GameEndPopup from '@/components/GameEndPopup';

const Dashboard = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
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
      {/* End of game popup */}

      {searchParams.get('sessionId') && (
        <GameEndPopup
          {...{
            isVisible: true,
            isAdmin: false,
            isOpen: true,
            onClose: () => {
              localStorage.setItem('sessionId', '');
            },
            sessionId: searchParams.get('sessionId') || '',
            continueAdministering: false,
          }}
        ></GameEndPopup>
      )}

      {/* Dashboard Layout */}
      <div
        className="flex min-h-screen flex-col bg-[#2f2f2f] pt-25 text-white
          sm:pt-40 md:flex-row"
      >
        {/* Sidebar */}
        <aside
          className="w-full flex-shrink-0 border-r border-gray-800 bg-[#1e1e1e]
            shadow-2xl md:w-72"
        >
          <nav className="p-6 pt-8">
            <ul className="space-y-2">
              <li>
                <Link
                  href="/dashboard"
                  className="flex items-center rounded-lg bg-blue-600 px-4 py-3
                    font-bold text-white transition-all duration-200
                    hover:bg-blue-500"
                >
                  Overview
                </Link>
              </li>
              <li>
                <Link
                  href="/reports"
                  className="flex items-center rounded-lg px-4 py-3 font-bold
                    text-white transition-all duration-200 hover:bg-gray-800"
                >
                  Game Reports
                </Link>
              </li>
              <li>
                <Link
                  href="/account"
                  className="flex items-center rounded-lg px-4 py-3 font-bold
                    text-white transition-all duration-200 hover:bg-gray-800"
                >
                  Account Details
                </Link>
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
            <h1 className="text-3xl font-bold">Welcome, {currentUsername}!</h1>
            <div className="flex gap-4">
              <button
                className="cursor-pointer rounded-lg bg-red-600 px-5 py-2.5
                  font-bold text-white transition-all duration-300
                  hover:bg-red-700"
                onClick={handleLogout}
              >
                Log Out
              </button>
            </div>
          </header>

          {/* Dashboard Widgets: Full-width stacked */}
          <section className="space-y-6">
            {/* Join or Create Game Banner */}
            <div className="rounded-2xl bg-[#1e1e1e] p-8 text-center shadow-md">
              <h3 className="mb-4 text-2xl font-bold text-gray-100">
                Ready to Play?
              </h3>
              <p className="mx-auto mb-8 max-w-lg text-gray-400">
                Jump into an active game lobby or launch a new session as an
                admin.
              </p>
              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <button
                  onClick={handleGoToJoin}
                  className="cursor-pointer rounded-lg bg-blue-600 px-8 py-3
                    text-center font-bold text-white transition-all duration-300
                    hover:bg-blue-700"
                >
                  Join a Game
                </button>
                <button
                  onClick={handleGoToCreation}
                  className="cursor-pointer rounded-lg bg-red-600 px-8 py-3
                    text-center font-bold text-white transition-all duration-300
                    hover:bg-red-700"
                >
                  Create a Game
                </button>
              </div>
            </div>

            {/* Join a clan */}
            <div className="rounded-2xl bg-[#1e1e1e] p-6 shadow-md">
              {clanLoading ? (
                <div className="text-center">
                  <h3 className="mb-2 text-lg font-semibold">Clan Status</h3>
                  <p className="text-gray-400">Loading...</p>
                </div>
              ) : userClan ? (
                // User is in a clan - show clan info and leave button
                <div>
                  <h3 className="mb-4 text-lg font-semibold">Your Clan</h3>
                  <div className="mb-4 rounded-xl bg-[#2f2f2f] p-4">
                    <div className="mb-2 flex items-start justify-between">
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
                    className="cursor-pointer rounded-xl bg-red-600 px-4 py-2
                      font-bold transition hover:bg-red-700"
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
                  <h3 className="mb-2 text-lg font-semibold">
                    Join or Create a Clan
                  </h3>
                  <p className="mb-4 text-gray-400">
                    Team up with other players to compete together.
                  </p>
                  <button
                    onClick={handleGoToClan}
                    className="mb-2 cursor-pointer rounded-xl bg-blue-600 px-4
                      py-2 font-bold transition hover:bg-blue-700"
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
