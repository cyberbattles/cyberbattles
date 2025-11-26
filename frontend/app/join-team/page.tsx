'use client';

import React, {useState, useEffect, useCallback} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  arrayUnion,
} from 'firebase/firestore';
import {db} from '@/lib/firebase';
import {useAuth} from '@/components/Auth';

const JoinTeam = () => {
  const router = useRouter();
  const {currentUser} = useAuth();
  const [teamId, setTeamId] = useState('');
  const [joinMessage, setJoinMessage] = useState({type: '', text: ''});
  const [isLoading, setIsLoading] = useState(false);
  const [showSetNameModal, setShowSetNameModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [editingTeamId, setEditingTeamId] = useState('');
  const [nameMessage, setNameMessage] = useState({type: '', text: ''});
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  const searchParams = useSearchParams();
  const [hasAutoSubmitted, setHasAutoSubmitted] = useState(false);

  const handleJoinTeam = useCallback(async () => {
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
    setShowSetNameModal(false);

    try {
      const joinedTeamId = teamId.trim();
      const teamRef = doc(db, 'teams', teamId.trim());
      const docSnap = await getDoc(teamRef);

      if (docSnap.exists()) {
        const teamData = docSnap.data();

        const wasTeamEmpty =
          !teamData.memberIds || teamData.memberIds.length === 0;

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
        const teamsRef = collection(db, 'teams');
        const teamsSnap = await getDocs(teamsRef);
        let found = false;
        teamsSnap.forEach(teamDoc => {
          const teamData = teamDoc.data();
          if (teamData.memberIds.includes(currentUser.uid)) {
            setJoinMessage({
              type: 'error',
              text: 'You are already in another team.',
            });
            found = true;
          }
        });
        if (found) {
          setIsLoading(false);
          return;
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
              text: "This team's session has already started. Please join another team.",
            });
            setIsLoading(false);
            return;
          }

          // Check if the joining user is the session admin
          if (sessionData.adminUid == currentUser.uid) {
            setJoinMessage({
              type: 'error',
              text: 'Session admins cannot join their own teams.',
            });
            setIsLoading(false);
            return;
          }
        }

        // Add the user's UID to the memberIds array
        await updateDoc(teamRef, {
          memberIds: arrayUnion(currentUser.uid),
        });

        setJoinMessage({
          type: 'success',
          text: `Successfully joined team: ${teamData.name}!`,
        });
        localStorage.setItem('sessionId', teamData.sessionId);
        setTeamId('');

        if (wasTeamEmpty) {
          // Let user name the team if they are the first member
          setEditingTeamId(joinedTeamId);
          setShowSetNameModal(true);
        } else {
          // Not the first user, just redirect to lobby
          router.push('/lobby');
        }
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
  }, [currentUser, isLoading, router, teamId]);

  const handleSetName = useCallback(async () => {
    if (isUpdatingName) return;

    const trimmedName = newTeamName.trim();

    // Validation
    if (trimmedName.length === 0) {
      setNameMessage({type: 'error', text: 'Team name cannot be empty.'});
      return;
    }
    if (trimmedName.length > 15) {
      setNameMessage({
        type: 'error',
        text: 'Team name must be 15 characters or less.',
      });
      return;
    }
    // Simple ASCII check (basic printable characters)
    const asciiRegex = /^[\x20-\x7E]*$/;
    if (!asciiRegex.test(trimmedName)) {
      setNameMessage({
        type: 'error',
        text: 'Name must contain only standard ASCII characters.',
      });
      return;
    }

    setIsUpdatingName(true);
    setNameMessage({type: '', text: ''});

    try {
      const teamRef = doc(db, 'teams', editingTeamId);
      await updateDoc(teamRef, {
        name: trimmedName,
      });

      setNameMessage({type: 'success', text: 'Team name updated!'});

      // Redirect to lobby after a short delay to show success
      setTimeout(() => {
        router.push('/lobby');
      }, 1500);
    } catch (error) {
      console.error('Error updating team name:', error);
      setNameMessage({
        type: 'error',
        text: 'Failed to update team name. Please try again.',
      });
      setIsUpdatingName(false); // Only set to false on error, success redirects
    }
  }, [isUpdatingName, newTeamName, editingTeamId, router]);

  const handleSkip = useCallback(() => {
    // If they skip, just go to the lobby
    router.push('/lobby');
  }, [router]); // Added dependency

  const handleBack = useCallback(() => {
    try {
      router.back();
    } catch (error) {
      console.error('Navigation failed:', error);
    }
  }, [router]);

  useEffect(() => {
    const paramTeamId = searchParams.get('teamId');

    // If we have a teamId in the URL and our state is empty, set it.
    if (paramTeamId && !teamId && !hasAutoSubmitted) {
      setTeamId(paramTeamId);
    }

    // If the state is now set from the param, we are logged in,
    // not already loading, and haven't tried to submit yet, then submit.
    if (
      paramTeamId &&
      teamId === paramTeamId &&
      currentUser &&
      !isLoading &&
      !hasAutoSubmitted
    ) {
      setHasAutoSubmitted(true); // Set flag to prevent re-submitting
      handleJoinTeam();
    }
  }, [
    teamId,
    currentUser,
    isLoading,
    searchParams,
    handleJoinTeam,
    hasAutoSubmitted,
  ]);

  return (
    <>
      <div className="flex h-screen bg-[#2f2f2f] pt-40 text-white">
        <main className="flex flex-1 flex-col items-center justify-center p-8">
          {showSetNameModal ? (
            // Set Team Name UI
            <>
              <header className="mb-12 text-center">
                <h1 className="mb-4 text-4xl font-bold">Set Team Name</h1>
                <p className="text-lg text-gray-300">
                  You're the first member! Set your team's name.
                </p>
              </header>

              <section className="flex flex-col items-center space-y-8">
                <div className="w-80">
                  <label
                    htmlFor="teamName"
                    className="mb-2 block text-sm font-medium text-gray-300"
                  >
                    New Team Name (up to 15 characters)
                  </label>
                  <input
                    id="teamName"
                    type="text"
                    value={newTeamName}
                    onChange={e => setNewTeamName(e.target.value)}
                    placeholder="Enter new team name"
                    disabled={isUpdatingName}
                    maxLength={15}
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
                      py-4 text-xl font-bold shadow-md transition
                      hover:opacity-90 disabled:cursor-not-allowed
                      disabled:opacity-50"
                    onClick={handleSetName}
                    disabled={isUpdatingName}
                  >
                    {isUpdatingName ? 'Saving...' : 'Set Name'}
                  </button>
                  <button
                    className="w-80 cursor-pointer rounded-2xl bg-gray-600 px-8
                      py-3 text-lg font-semibold shadow-md transition
                      hover:opacity-90 disabled:opacity-50"
                    onClick={handleSkip}
                    disabled={isUpdatingName}
                  >
                    Skip
                  </button>
                  {nameMessage.text && (
                    <p
                      className={`mt-3 text-sm ${
                        nameMessage.type === 'success'
                          ? 'text-green-400'
                          : 'text-red-400'
                        }`}
                    >
                      {nameMessage.text}
                    </p>
                  )}
                </div>
              </section>
            </>
          ) : (
            // Join Team UI
            <>
              <header className="mb-12 text-center">
                <h1 className="mb-4 text-4xl font-bold">Join Team</h1>
                <p className="text-lg text-gray-300">
                  Enter your team code to join the challenge
                </p>
              </header>

              <section className="flex flex-col items-center space-y-8">
                <div className="w-80">
                  <label
                    htmlFor="teamCode"
                    className="mb-2 block text-sm font-medium text-gray-300"
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
                      py-4 text-xl font-bold shadow-md transition
                      hover:opacity-90 disabled:cursor-not-allowed
                      disabled:opacity-50"
                    onClick={handleJoinTeam}
                    disabled={isLoading || !currentUser}
                  >
                    {isLoading ? 'Joining...' : 'Join Team'}
                  </button>
                  <button
                    className="w-80 cursor-pointer rounded-2xl bg-gray-600 px-8
                      py-3 text-lg font-semibold shadow-md transition
                      hover:opacity-90 disabled:opacity-50"
                    onClick={handleBack}
                    disabled={isLoading}
                  >
                    Go Back
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
            </>
          )}
        </main>
      </div>
    </>
  );
};

export default JoinTeam;
