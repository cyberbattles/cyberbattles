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
} from 'firebase/firestore';
import {useAuth} from '@/components/Auth';
import {useRouter} from 'next/navigation';
import {FaLink} from 'react-icons/fa';

interface SolutionBlock {
  type: 'heading' | 'paragraph' | 'code' | 'link';
  content: string;
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
            className="text-2xl font-bold text-blue-300 mt-6 mb-3"
          >
            {block.content}
          </h3>
        );
      case 'paragraph':
        return (
          <p key={index} className="text-gray-300 leading-relaxed mb-4">
            {block.content}
          </p>
        );
      case 'code':
        return (
          <pre
            key={index}
            className="bg-[#1e1e1e] p-4 rounded-lg overflow-x-auto my-4 border border-gray-700"
          >
            <code className={`font-mono text-sm text-green-300`}>
              {block.content}
            </code>
          </pre>
        );
      case 'link':
        return (
          <a
            key={index}
            href={block.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-400 hover:text-blue-300 hover:underline transition-colors"
          >
            <FaLink size={14} />
            <span>{block.text || block.url}</span>
          </a>
        );
      default:
        return null;
    }
  };

  return <div className="prose-dark">{solution.blocks.map(renderBlock)}</div>;
};

interface DesignProps {
  reports: Report[];
}

const Reports: React.FC<DesignProps> = ({reports}) => {
  const [activeTab, setActiveTab] = useState(reports[0]?.id || '');

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <nav className="flex md:flex-col flex-shrink-0 md:w-64">
        {reports.map(report => (
          <button
            key={report.id}
            onClick={() => setActiveTab(report.id)}
            className={`w-full p-4 text-left font-medium rounded-lg transition-colors ${
              activeTab === report.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-[#2a2a2a]'
            }`}
          >
            {report.scenarioTitle}
          </button>
        ))}
      </nav>

      <div className="flex-1 bg-[#1e1e1e] p-6 rounded-2xl shadow-md border border-gray-700 min-h-[300px]">
        {reports.map(report =>
          activeTab === report.id ? (
            <div key={report.id}>
              <h2 className="text-3xl font-bold text-gray-100 mb-6">
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

  return (
    <div className="flex flex-col min-h-screen pt-20 sm:pt-40 bg-[#2f2f2f] text-white">
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 className="text-3xl font-bold">Game Reports</h1>
          <button
            className="px-5 py-2.5 bg-gray-700 rounded-xl hover:bg-gray-600 transition font-bold"
            onClick={() => router.push('/dashboard')}
          >
            Back to Dashboard
          </button>
        </header>

        <div>
          {isLoading && (
            <div className="flex items-center justify-center gap-3 p-6 bg-[#1e1e1e] rounded-2xl">
              <div className="animate-spin h-6 w-6 border-2 border-blue-400 border-t-transparent rounded-full"></div>
              <span className="text-gray-300 text-lg">
                Loading completed game reports...
              </span>
            </div>
          )}

          {!isLoading && error && (
            <div className="p-6 bg-red-900/30 border border-red-500 rounded-2xl">
              <p className="text-red-400 font-semibold">{error}</p>
            </div>
          )}

          {!isLoading && !error && reports.length === 0 && (
            <div className="p-6 bg-[#1e1e1e] rounded-2xl text-center">
              <h2 className="text-2xl font-semibold text-gray-400 mb-2">
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
