'use client';
import React, {useState, useEffect} from 'react';
import {db} from '@/lib/firebase';
import {
  collection,
  query,
  where,
  doc,
  getDoc,
  getDocs,
  updateDoc,
} from 'firebase/firestore';
import {useAuth} from '@/components/Auth';
import {useRouter} from 'next/navigation';
import {FaLink} from 'react-icons/fa';

interface SolutionBlock {
  type: 'heading' | 'paragraph' | 'code' | 'link' | 'list';
  content?: string;
  items?: string[];
  style?: 'ordered' | 'unordered';
  language?: string;
  url?: string;
  text?: string;
}

interface Solution {
  blocks: SolutionBlock[];
}

interface Report {
  id: string;
  scenarioTitle: string;
  solution: Solution;
}

interface SolutionRendererProps {
  solution: Solution;
}

const SolutionRenderer: React.FC<SolutionRendererProps> = ({solution}) => {
  if (!solution || !solution.blocks) {
    return (
      <p className="text-gray-500">
        This scenario does not have a solution available yet.
      </p>
    );
  }

  const renderBlock = (block: SolutionBlock, index: number) => {
    switch (block.type) {
      case 'heading':
        return (
          <h3
            key={index}
            className="mt-8 mb-4 border-b border-gray-700 pb-2 text-2xl font-bold text-blue-300"
          >
            {block.content}
          </h3>
        );
      case 'paragraph':
        return (
          <p key={index} className="mb-4 leading-relaxed text-gray-300">
            {block.content}
          </p>
        );
      case 'code':
        return (
          <div key={index} className="group relative my-4">
            <div className="absolute top-0 right-0 rounded-bl-lg border-b border-l border-gray-700 bg-gray-800 px-2 py-1 text-xs text-gray-500">
              {block.language || 'code'}
            </div>
            <pre className="overflow-x-auto rounded-lg border border-gray-700 bg-[#151515] p-4 shadow-inner">
              <code className={`font-mono text-sm text-white`}>
                {block.content}
              </code>
            </pre>
          </div>
        );
      case 'list':
        const ListTag = block.style === 'ordered' ? 'ol' : 'ul';
        const listStyles =
          block.style === 'ordered' ? 'list-decimal' : 'list-disc';
        return (
          <ListTag
            key={index}
            className={`${listStyles} mb-6 ml-6 list-outside space-y-2 text-gray-300 marker:text-blue-400`}
          >
            {block.items?.map((item, i) => (
              <li key={i} className="pl-2">
                {item}
              </li>
            ))}
          </ListTag>
        );
      case 'link':
        return (
          <div key={index} className="mb-2">
            <a
              href={block.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-md border border-blue-900/50 bg-blue-900 px-3 py-1.5 text-blue-100 transition-colors hover:text-blue-300 hover:underline"
            >
              <FaLink size={12} />
              <span>{block.text || block.url}</span>
            </a>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="prose-dark max-w-4xl">
      {solution.blocks.map(renderBlock)}
    </div>
  );
};

interface DesignProps {
  reports: Report[];
}

const Reports: React.FC<DesignProps> = ({reports}) => {
  const [activeTab, setActiveTab] = useState(reports[0]?.id || '');

  return (
    <div className="flex flex-col gap-6 md:flex-row">
      <nav className="flex flex-shrink-0 md:w-64 md:flex-col">
        {reports.map(report => (
          <button
            key={report.id}
            onClick={() => setActiveTab(report.id)}
            className={`w-full cursor-pointer rounded-lg p-4 text-left
            font-semibold transition-colors ${
              activeTab === report.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-[#2a2a2a]'
            }`}
          >
            {report.scenarioTitle}
          </button>
        ))}
      </nav>

      <div
        className="min-h-[300px] flex-1 rounded-2xl border border-gray-700
          bg-[#1e1e1e] p-6 shadow-md"
      >
        {reports.map(report =>
          activeTab === report.id ? (
            <div key={report.id}>
              <h2 className="mb-6 text-3xl font-bold text-gray-100">
                {report.scenarioTitle}
              </h2>
              <SolutionRenderer solution={report.solution} />
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
};

const GameReportsPage = () => {
  const router = useRouter();
  const {currentUser} = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    const fetchReports = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Find all finished sessions the user participated in
        const sessionsQuery = query(
          collection(db, 'finishedSessions'),
          where('gameParticipants', 'array-contains', currentUser.uid),
        );
        const sessionsSnap = await getDocs(sessionsQuery);

        if (sessionsSnap.empty) {
          console.log('No finished sessions found for this user.');
          setIsLoading(false);
          return;
        }

        // Get all unique scenario IDs from those sessions
        const scenarioIds = new Set<string>();
        sessionsSnap.docs.forEach(doc => {
          const id = doc.data().scenarioId;
          if (id) {
            scenarioIds.add(id);
          }
        });

        const uniqueIds = Array.from(scenarioIds);

        //Fetch the scenario details for each unique ID
        const reportPromises = uniqueIds.map(async id => {
          const scenarioRef = doc(db, 'scenarios', id);
          const scenarioSnap = await getDoc(scenarioRef);

          if (scenarioSnap.exists()) {
            const data = scenarioSnap.data();
            return {
              id: scenarioSnap.id,
              scenarioTitle: data.scenario_title || 'Untitled Scenario',
              solution: data.solution || {blocks: []}, // Ensure solution exists
            } as Report;
          }
          return null; // Return null if scenario doc doesn't exist
        });

        // 4. Wait for all fetches and filter out any nulls
        const fetchedReports = (await Promise.all(reportPromises)).filter(
          (report): report is Report => report !== null,
        );

        setReports(fetchedReports);
      } catch (err) {
        console.error('Error fetching game reports:', err);
        setError('Failed to load game reports. Please try again later.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchReports();
  }, [currentUser]);

  // const addSolutionToScenario = async () => {
  //   // 1. SET THE SCENARIO ID YOU WANT TO UPDATE
  //   const SCENARIO_ID_TO_UPDATE = '8429abfca004aed7'; // <--- !!! SET THIS
  //
  //   // 2. THE DATA TO ADD (as you provided)
  //   const solutionData = {}
  //   // 3. THE FIRESTORE LOGIC
  //   try {
  //     console.log(`Updating scenario: ${SCENARIO_ID_TO_UPDATE}...`);
  //     const scenarioRef = doc(db, 'scenarios', SCENARIO_ID_TO_UPDATE);
  //
  //     // Use updateDoc to add/merge the 'solution' field
  //     // This will not overwrite the whole document
  //     await updateDoc(scenarioRef, solutionData);
  //
  //     alert(`SUCCESS! Scenario ${SCENARIO_ID_TO_UPDATE} was updated.`);
  //     console.log(`SUCCESS! Scenario ${SCENARIO_ID_TO_UPDATE} was updated.`);
  //   } catch (error) {
  //     console.error('Error updating document:', error);
  //     alert(
  //       `Error: ${(error as Error).message}. Check console and security rules.`,
  //     );
  //   }
  // };

  return (
    <div
      className="flex min-h-screen flex-col bg-[#2f2f2f] pt-20 text-white
        sm:pt-40"
    >
      <main className="mx-auto w-full max-w-7xl flex-1 overflow-y-auto p-4 md:p-8">
        <header
          className="mb-8 flex flex-col items-start justify-between gap-4
            sm:flex-row sm:items-center"
        >
          <h1 className="text-3xl font-bold">Game Reports</h1>
          <button
            className="cursor-pointer rounded-xl bg-gray-700 px-5 py-2.5
              font-bold transition hover:bg-gray-600"
            onClick={() => router.push('/dashboard')}
          >
            Back to Dashboard
          </button>
        </header>

        {/* <div className="bg-yellow-800 border border-yellow-500 p-4 rounded-lg mb-6 text-center"> */}
        {/*   <h3 className="text-xl font-bold text-yellow-200">Developer Tool</h3> */}
        {/*   <p className="text-yellow-300 mb-3"> */}
        {/*     Click this button to add the solution to the scenario specified in */}
        {/*     the code. */}
        {/*   </p> */}
        {/*   <button */}
        {/*     onClick={addSolutionToScenario} */}
        {/*     className="cursor-pointer px-6 py-3 bg-red-600 text-white font-bold rounded-lg hover:bg-red-500" */}
        {/*   > */}
        {/*     !!! Run Temporary Solution-Adder !!! */}
        {/*   </button> */}
        {/*   <p className="text-yellow-400 mt-2 text-sm"> */}
        {/*     (Remember to remove this code after use) */}
        {/*   </p> */}
        {/* </div> */}

        <div>
          {isLoading && (
            <div
              className="flex items-center justify-center gap-3 rounded-2xl
                bg-[#1e1e1e] p-6"
            >
              <div
                className="h-6 w-6 animate-spin rounded-full border-2
                  border-blue-400 border-t-transparent"
              ></div>
              <span className="text-lg text-gray-300">
                Loading completed game reports...
              </span>
            </div>
          )}

          {!isLoading && error && (
            <div className="rounded-2xl border border-red-500 bg-red-900/30 p-6">
              <p className="font-semibold text-red-400">{error}</p>
            </div>
          )}

          {!isLoading && !error && reports.length === 0 && (
            <div className="rounded-2xl bg-[#1e1e1e] p-6 text-center">
              <h2 className="mb-2 text-2xl font-semibold text-gray-400">
                No Reports Found
              </h2>
              <p className="text-gray-500">
                You haven't completed any games yet. Finish a game to see its
                solution and report here!
              </p>
            </div>
          )}

          {!isLoading && !error && reports.length > 0 && (
            <>
              <Reports reports={reports} />
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default GameReportsPage;
