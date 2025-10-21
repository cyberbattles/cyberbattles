// REF: Adapted from https://vaul.emilkowal.ski/inputs
// REF: Flag png is from https://fonts.google.com/icons

import {Drawer} from 'vaul';
import flagIcon from '../public/images/flag.png';
import Image from 'next/image';
import {useState} from 'react';
import {
  collection,
  query,
  where,
  getDocs,
  runTransaction,
  doc,
  arrayRemove,
  limit,
} from 'firebase/firestore';

import {db} from '@/lib/firebase';
import {useAuth} from './Auth';

/**
 * An interface representing a team in the session.
 */
interface Team {
  /** The name of the team. */
  name: string;
  /** The number of members in the team. */
  numMembers: number;
  /** The user ids of each member of the team. */
  memberIds: string[];
  /** The Docker containerId associated with the team. */
  containerId: string;
  /** A unique identifier for the team. */
  id: string;
  /** The session ID of the session this team belongs to. */
  sessionId: string;
  /** The IP address assigned to the team's container, on the WireGuard network. */
  ipAddress: string | null;
  /** How many times the flag bot has failed to submit flags for this team. */
  downCount: number;
  /** The total number of times the flag bot has tried to insert flags for this team. */
  totalCount: number;
  /** The total score of the team. */
  totalScore: number;
  /** The list of active flags for this team. */
  activeFlags: string[];
}

export default function FlagPopup() {
  const [flag, setFlag] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const {currentUser} = useAuth();

  /**
   * Handles the submission of a flag.
   */
  const handleFlagSubmit = async () => {
    if (!currentUser) {
      setErrorMsg('You must be logged in to submit a flag.');
      return;
    }
    if (!flag) {
      setErrorMsg('Please enter a flag.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    const teamsRef = collection(db, 'teams');

    try {
      // --- Step 1: Find Submitter's Team ---
      const qSubmitter = query(
        teamsRef,
        where('memberIds', 'array-contains', currentUser.uid),
        limit(1),
      );
      const submitterSnapshot = await getDocs(qSubmitter);

      if (submitterSnapshot.empty) {
        throw new Error('Could not find your team.');
      }
      const submitterTeamDoc = submitterSnapshot.docs[0];
      const submitterTeamRef = doc(db, 'teams', submitterTeamDoc.id);

      // --- Step 2: Find Victim's Team ---
      const qVictim = query(
        teamsRef,
        where('activeFlags', 'array-contains', flag),
        limit(1),
      );
      const victimSnapshot = await getDocs(qVictim);

      if (victimSnapshot.empty) {
        throw new Error('Invalid or already-submitted flag.');
      }
      const victimTeamDoc = victimSnapshot.docs[0];
      const victimTeamRef = doc(db, 'teams', victimTeamDoc.id);

      // --- Validation: Check for self-submission ---
      if (submitterTeamRef.id === victimTeamRef.id) {
        throw new Error("You can't submit your own team's flag!");
      }

      // --- Run Atomic Transaction for Scoring ---
      await runTransaction(db, async transaction => {
        // Get the most-up-to-date doc data inside the transaction
        const victimTeam = await transaction.get(victimTeamRef);
        const submitterTeam = await transaction.get(submitterTeamRef);

        if (!victimTeam.exists() || !submitterTeam.exists()) {
          throw new Error('Team data could not be found.');
        }

        const victimData = victimTeam.data() as Team;
        const submitterData = submitterTeam.data() as Team;

        // Check again if flag is still active (someone else might have submitted it)
        if (!victimData.activeFlags.includes(flag)) {
          throw new Error('This flag was just submitted by another team!');
        }

        const newVictimScore = victimData.totalScore - 100;
        const newSubmitterScore = submitterData.totalScore + 100;

        // Update victim: -100 points and remove the flag
        transaction.update(victimTeamRef, {
          totalScore: newVictimScore,
          activeFlags: arrayRemove(flag),
        });

        // Update submitter: +100 points
        transaction.update(submitterTeamRef, {
          totalScore: newSubmitterScore,
        });
      });

      setSuccessMsg('Flag captured! +100 points.');
      setFlag(''); // Clear input on success
    } catch (error) {
      console.error('Flag submission error:', error);
      if (error instanceof Error) {
        setErrorMsg(error.message);
      } else {
        setErrorMsg('An unknown error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Drawer.Root>
      <Drawer.Trigger className="absolute right-10 bottom-15 flex w-15 h-15 flex-shrink-0 items-center justify-center gap-2 overflow-hidden rounded-full bg-white px-4 font-bold shadow-sm transition-all hover:bg-[#FAFAFA] dark:bg-[#ba1e1e] dark:hover:bg-[#981818] dark:text-white text-2xl">
        <Image src={flagIcon} alt="Flag icon" width={150} />
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/65" />
        <Drawer.Content className="dark:bg-[#ba1e1e] w-1/3 flex absolute right-10 bottom-0 max-h-[70vh] rounded-t-[50px]">
          <div className="max-w-md w-full mx-auto overflow-auto p-4 rounded-t-[10px]">
            <Drawer.Handle />
            <Drawer.Title className="font-bold text-center dark:text-white text-2xl mt-8">
              Submit Flag
            </Drawer.Title>

            {/* Success Message */}
            {successMsg && (
              <div className="mt-4 p-3 rounded-lg bg-green-100 text-green-800 text-center">
                {successMsg}
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div className="mt-4 p-3 rounded-lg bg-red-100 text-red-800 text-center">
                {errorMsg}
              </div>
            )}

            <label
              htmlFor="name"
              className="font-medium text-white text-sm mt-8 mb-2 block"
            >
              Enter your flag here:
            </label>
            <input
              id="name"
              className="border border-gray-200 bg-white w-full px-3 h-9 rounded-lg outline-none focus:ring-2 focus:ring-black/5 text-gray-900"
              value={flag}
              onChange={e => setFlag(e.target.value)}
              disabled={loading}
            />

            <button
              className="h-[44px] bg-black dark:text-white rounded-lg mt-4 w-full font-medium transition-all disabled:bg-gray-700"
              onClick={handleFlagSubmit}
              disabled={loading}
            >
              {loading ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
