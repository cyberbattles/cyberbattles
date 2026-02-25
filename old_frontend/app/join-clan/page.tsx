'use client';

import React, {useState, useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  collection,
  where,
  query,
  getDocs,
} from 'firebase/firestore';
import {db} from '@/lib/firebase';
import {useAuth} from '@/components/Auth';

const JoinClan = () => {
  const router = useRouter();
  const [clanId, setClanId] = useState('');
  const [joinMessage, setJoinMessage] = useState({type: '', text: ''});
  const [isLoading, setIsLoading] = useState(false);
  const [isInClan, setIsInClan] = useState(false);
  const [uid, setUid] = useState<string | null>(null);
  const {currentUser} = useAuth();

  // Monitor auth state changes
  useEffect(() => {
    const fetchUid = async () => {
      if (currentUser) {
        setUid(currentUser.uid);
        localStorage.setItem('currentuid', currentUser.uid);
      } else {
        setUid(null);
        localStorage.removeItem('currentuid');
      }
    };

    fetchUid();
  }, [currentUser]);

  useEffect(() => {
    const checkUserClan = async () => {
      if (!uid) {
        setIsInClan(false);
        return;
      }

      try {
        const clansRef = collection(db, 'clans');
        const q = query(clansRef, where('memberIds', 'array-contains', uid));
        const querySnapshot = await getDocs(q);

        // Simply set a boolean
        setIsInClan(!querySnapshot.empty);
      } catch (error) {
        console.error('Error checking user clan:', error);
        setIsInClan(false);
      }
    };

    checkUserClan();
  }, [uid]);

  const handleJoinTeam = async () => {
    // Prevent multiple submissions
    if (isLoading) return;

    // Basic validation
    if (!clanId.trim()) {
      setJoinMessage({type: 'error', text: 'Please enter a Team ID.'});
      return;
    }

    if (!currentUser) {
      setJoinMessage({
        type: 'error',
        text: 'You must be logged in to join a team.',
      });
      return;
    }

    if (isInClan) {
      setJoinMessage({
        type: 'error',
        text: `You are already in a clan. Leave it before joining another.`,
      });
      return;
    }

    setIsLoading(true);
    setJoinMessage({type: '', text: ''});

    try {
      const teamRef = doc(db, 'clans', clanId.trim());
      const docSnap = await getDoc(teamRef);

      if (docSnap.exists()) {
        const clanData = docSnap.data();

        // Check if user is already a member
        if (
          clanData.memberIds &&
          clanData.memberIds.includes(currentUser.uid)
        ) {
          setJoinMessage({
            type: 'error',
            text: 'You are already a member of this team.',
          });
          setIsLoading(false);
          router.push('/dashboard');

          return;
        }

        // Add the user's UID to the memberIds array
        await updateDoc(teamRef, {
          memberIds: arrayUnion(currentUser.uid),
        });

        setJoinMessage({
          type: 'success',
          text: `Successfully joined clan: ${clanData.name}!`,
        });
        setClanId('');

        const userRef = doc(db, 'login', currentUser.uid);
        await updateDoc(userRef, {
          inClan: true,
        });

        // Redirects to dashboard page after join team
        router.push('/dashboard');
      } else {
        setJoinMessage({
          type: 'error',
          text: 'Clan not found. Please check the ID and try again.',
        });
      }
    } catch (error) {
      console.error('Error joining team:', error);
      setJoinMessage({
        type: 'error',
        text: 'Could not join clan. Please try again later.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToSelection = () => {
    try {
      router.push('/clan');
    } catch (error) {
      console.error('Navigation failed:', error);
    }
  };

  return (
    <>
      <div className="flex h-screen bg-[#2f2f2f] pt-40 text-white">
        <main className="flex flex-1 flex-col items-center justify-center p-8">
          <header className="mb-12 text-center">
            <h1 className="mb-4 text-4xl font-bold">Join Clan</h1>
            <p className="text-lg text-gray-300">Enter your Clan ID to join.</p>
          </header>

          <section className="flex flex-col items-center space-y-8">
            <div className="w-80">
              <label
                htmlFor="teamCode"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Clan Code
              </label>
              <input
                id="teamCode"
                type="text"
                value={clanId}
                onChange={e => setClanId(e.target.value)}
                placeholder="Enter Clan ID"
                disabled={isLoading}
                className="w-full rounded-2xl border border-gray-600
                  bg-[#1e1e1e] px-4 py-3 text-white placeholder-gray-400
                  transition focus:border-blue-400 focus:ring-1
                  focus:ring-blue-400 focus:outline-none
                  disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>

            <div className="flex flex-col items-center space-y-4">
              <button
                className="w-80 cursor-pointer rounded-2xl bg-green-600 px-8
                  py-4 text-xl font-bold shadow-md transition hover:opacity-90
                  disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleJoinTeam}
                disabled={isLoading || !currentUser}
              >
                {isLoading ? 'Joining...' : 'Join Clan'}
              </button>
              <button
                className="w-80 cursor-pointer rounded-2xl bg-gray-600 px-8 py-3
                  text-lg font-semibold shadow-md transition hover:opacity-90
                  disabled:opacity-50"
                onClick={handleBackToSelection}
                disabled={isLoading}
              >
                Back to Selection
              </button>
              {joinMessage.text && (
                <p
                  className={`mt-3 text-sm ${
                    joinMessage.type === 'success'
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}
                >
                  {joinMessage.text}
                </p>
              )}
            </div>
          </section>
        </main>
      </div>
    </>
  );
};

export default JoinClan;
