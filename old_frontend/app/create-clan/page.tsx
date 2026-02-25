'use client';

import React, {useState, useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {
  doc,
  setDoc,
  collection,
  getDocs,
  where,
  query,
} from 'firebase/firestore';
import {db} from '@/lib/firebase';
import {updateDoc} from 'firebase/firestore';
import {useAuth} from '@/components/Auth';

const CreateClan = () => {
  const router = useRouter();
  const [clanTag, setClanTag] = useState('');
  const [numMembers, setNumMembers] = useState(10);
  const [createMessage, setCreateMessage] = useState({type: '', text: ''});
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

  const generateClanId = () => {
    // Generate a random 8-character ID
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleCreateClan = async () => {
    // Prevent multiple submissions
    if (isLoading) return;

    // Basic validation
    if (!clanTag.trim()) {
      setCreateMessage({type: 'error', text: 'Please enter a Clan Tag.'});
      return;
    }

    if (isInClan) {
      setCreateMessage({
        type: 'error',
        text: `You are already in a clan. Leave it before joining another.`,
      });
      return;
    }

    if (clanTag.trim().length < 3 || clanTag.trim().length > 20) {
      setCreateMessage({
        type: 'error',
        text: 'Clan Tag must be between 3 and 20 characters.',
      });
      return;
    }

    if (!currentUser) {
      setCreateMessage({
        type: 'error',
        text: 'You must be logged in to create a clan.',
      });
      return;
    }

    setIsLoading(true);
    setCreateMessage({type: '', text: ''});

    try {
      // Generate a unique clan ID
      const clanId = generateClanId();

      // Create the clan document reference
      const clanRef = doc(db, 'clans', clanId);

      // Create the clan data
      const clanData = {
        clanTag: clanTag.trim(),
        numMembers: numMembers,
        clanId: clanId,
        memberIds: [currentUser.uid], // Creator is automatically a member
        createdAt: new Date(),
        createdBy: currentUser.uid,
        totalScore: 0,
      };

      // Write the clan document to Firestore
      await setDoc(clanRef, clanData);

      const userRef = doc(db, 'login', currentUser.uid);
      await updateDoc(userRef, {
        inClan: true,
      });

      setCreateMessage({
        type: 'success',
        text: `Successfully created clan: ${clanTag.trim()}! Clan ID: ${clanId}`,
      });

      // Clear form
      setClanTag('');
      setNumMembers(10);

      // Redirect to lobby after successful creation
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (error) {
      console.error('Error creating clan:', error);
      setCreateMessage({
        type: 'error',
        text: 'Could not create clan. Please try again later.',
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
            <h1 className="mb-4 text-4xl font-bold">Create Clan</h1>
            <p className="text-lg text-gray-300">
              Create your own clan and invite members.
            </p>
          </header>

          <section className="flex flex-col items-center space-y-8">
            <div className="w-80">
              <label
                htmlFor="clanTag"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Clan Tag
              </label>
              <input
                id="clanTag"
                type="text"
                value={clanTag}
                onChange={e => setClanTag(e.target.value)}
                placeholder="Enter Clan Tag"
                disabled={isLoading}
                maxLength={20}
                className="w-full rounded-2xl border border-gray-600 bg-[#1e1e1e] px-4 py-3 text-white placeholder-gray-400 transition focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="mt-1 text-xs text-gray-400">3-20 characters</p>
            </div>

            <div className="w-80">
              <label
                htmlFor="numMembers"
                className="mb-2 block text-sm font-medium text-gray-300"
              >
                Maximum Members: {numMembers}
              </label>
              <input
                id="numMembers"
                type="range"
                min="5"
                max="50"
                step="5"
                value={numMembers}
                onChange={e => setNumMembers(parseInt(e.target.value))}
                disabled={isLoading}
                className="slider h-2 w-full cursor-pointer appearance-none rounded-lg bg-[#1e1e1e] disabled:cursor-not-allowed disabled:opacity-50"
              />
              <div className="mt-1 flex justify-between text-xs text-gray-400">
                <span>5</span>
                <span>50</span>
              </div>
            </div>

            <div className="flex flex-col items-center space-y-4">
              <button
                className="w-80 cursor-pointer rounded-2xl bg-blue-600 px-8 py-4 text-xl font-bold shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={handleCreateClan}
                disabled={isLoading || !currentUser}
              >
                {isLoading ? 'Creating...' : 'Create Clan'}
              </button>
              <button
                className="w-80 cursor-pointer rounded-2xl bg-gray-600 px-8 py-3 text-lg font-semibold shadow-md transition hover:opacity-90 disabled:opacity-50"
                onClick={handleBackToSelection}
                disabled={isLoading}
              >
                Back to Selection
              </button>
              {createMessage.text && (
                <p
                  className={`mt-3 max-w-80 text-center text-sm ${
                    createMessage.type === 'success'
                      ? 'text-green-400'
                      : 'text-red-400'
                  }`}
                >
                  {createMessage.text}
                </p>
              )}
            </div>
          </section>
        </main>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: none;
        }
      `}</style>
    </>
  );
};

export default CreateClan;
