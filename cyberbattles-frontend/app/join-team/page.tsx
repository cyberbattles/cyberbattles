'use client';

import React, {useState} from 'react';
import {useRouter} from 'next/navigation';
import {doc, getDoc, updateDoc, arrayUnion} from 'firebase/firestore';
import {db} from '@/lib/firebase';
import {useAuth} from '@/components/Auth';

const JoinTeam = () => {
  const router = useRouter();
  const [teamId, setTeamId] = useState('');
  const [joinMessage, setJoinMessage] = useState({type: '', text: ''});
  const [isLoading, setIsLoading] = useState(false);
  const {currentUser} = useAuth();

  const handleJoinTeam = async () => {
    // Prevent multiple submissions
    if (isLoading) return;

    // Basic validation
    if (!teamId.trim()) {
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

    setIsLoading(true);
    setJoinMessage({type: '', text: ''});

    try {
      const teamRef = doc(db, 'teams', teamId.trim());
      const docSnap = await getDoc(teamRef);

      if (docSnap.exists()) {
        const teamData = docSnap.data();

        // Check if joining would exceed team limit
        if (
          teamData.memberIds &&
          teamData.memberIds.length >= teamData.numMembers
        ) {
          setJoinMessage({
            type: 'error',
            text: 'This team is already full. Please join another team.',
          });
          return;
        }

        // Check if user is already a member
        if (
          teamData.memberIds &&
          teamData.memberIds.includes(currentUser.uid)
        ) {
          setJoinMessage({
            type: 'error',
            text: 'You are already a member of this team.',
          });
          setIsLoading(false);
          router.push('/lobby');

          return;
        }

        // Check if the user is already in another team
        // NOTE:  This is commented out because currently the teamId value of
        //        user docs does not get updated. This should happen here somewhere.

        const userRef = doc(db, 'login', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();

          if (userData.teamId != "") {
            setJoinMessage({
            type: 'error',
            text: 'You are already in another team.',
            });
            setIsLoading(false);
            return;
          }
        }

        // Check the session values
        const sessionRef = doc(db, 'sessions', teamData.sessionId);
        const sessionSnap = await getDoc(sessionRef);
        if (sessionSnap.exists()) {
          const sessionData = sessionSnap.data();

          // Check if session has started
          if (sessionData.started) {
            setJoinMessage({
            type: 'error',
            text: 'This team\'s session has already started. Please join another team.',
            });
            setIsLoading(false);
            return;
          }

          // Check if the joining user is the session admin
          if (sessionData.adminUid == currentUser.uid) {
            setJoinMessage({
            type: 'error',
            text: 'Session admin cannot join their teams. Please join another team.',
            });
            setIsLoading(false);
            return;
          }
        }

        // Add the user's UID to the memberIds array
        await updateDoc(teamRef, {
          memberIds: arrayUnion(currentUser.uid),
        });

        // Add the team ID to the user's doc
        await updateDoc(userRef, {
          teamId: teamId,
        });
        
        setJoinMessage({
          type: 'success',
          text: `Successfully joined team: ${teamData.name}!`,
        });
        setTeamId('');

        // Redirects to lobby page after join team
        router.push('/lobby');
      } else {
        setJoinMessage({
          type: 'error',
          text: 'Team not found. Please check the ID and try again.',
        });
      }
    } catch (error) {
      console.error('Error joining team:', error);
      setJoinMessage({
        type: 'error',
        text: 'Could not join team. Please try again later.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToSelection = () => {
    try {
      router.push('/dashboard');
    } catch (error) {
      console.error('Navigation failed:', error);
    }
  };

  return (
    <>
      <div className="flex h-screen pt-40 bg-[#2f2f2f] text-white">
        <main className="flex-1 flex flex-col items-center justify-center p-8">
          <header className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Join Team</h1>
            <p className="text-lg text-gray-300">
              Enter your team code to join the challenge
            </p>
          </header>

          <section className="flex flex-col items-center space-y-8">
            <div className="w-80">
              <label
                htmlFor="teamCode"
                className="block text-sm font-medium text-gray-300 mb-2"
              >
                Team Code
              </label>
              <input
                id="teamCode"
                type="text"
                value={teamId}
                onChange={e => setTeamId(e.target.value)}
                placeholder="Enter team ID"
                disabled={isLoading}
                className="w-full px-4 py-3 bg-[#1e1e1e] border border-gray-600 rounded-2xl text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            <div className="flex flex-col items-center space-y-4">
              <button
                className="w-80 py-4 px-8 bg-green-600 rounded-2xl hover:opacity-90 transition font-bold text-xl shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleJoinTeam}
                disabled={isLoading || !currentUser}
              >
                {isLoading ? 'Joining...' : 'Join Team'}
              </button>
              <button
                className="w-80 py-3 px-8 bg-gray-600 rounded-2xl hover:opacity-90 transition font-semibold text-lg shadow-md disabled:opacity-50"
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

export default JoinTeam;
