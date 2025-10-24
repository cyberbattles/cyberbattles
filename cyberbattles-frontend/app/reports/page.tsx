'use client';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import {auth, db} from '@/lib/firebase';
import React, {useEffect, useState, useRef} from 'react';
import {
  CheckCircle,
  XCircle,
  TrendingUp,
  Award,
  Target,
  AlertCircle,
} from 'lucide-react';

const Reports = () => {
  const [userClan, setUserClan] = useState<any>(null);
  const [teamId, setteamId] = useState<any>(null);
  const [clanLoading, setClanLoading] = useState(true);

  type ContentSegment =
    | {type: 'text'; content: string}
    | {type: 'heading'; content: string}
    | {type: 'code'; content: string};

  type ChallengeItem = {
    id: number;
    title: string;
    segments: ContentSegment[];
    completed: boolean;
    attempts: number;
    resources?: string[];
    difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  };

  const CodeBlock = ({content}: {content: string}) => {
    return (
      <div className="relative group">
        <div className="absolute inset-0 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300"></div>
        <div className="relative bg-gray-900/90 backdrop-blur-sm borderrounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-400/50 border-b border-gray-400/50">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            </div>
            <span className="text-xs text-gray-400">bash</span>
          </div>
          <pre className="p-4 text-sm text-green-500 font-mono overflow-x-auto">
            <code>{content}</code>
          </pre>
        </div>
      </div>
    );
  };

  const [challenges, setChallenges] = useState<ChallengeItem[]>([
    {
      id: 1,
      title: 'Cybernote',
      difficulty: 'Beginner',
      completed: false,
      attempts: 2,
      segments: [
        {
          type: 'text',
          content:
            'This challenge demonstrates a web server that is exploitable by players via an SQL attack. The login page for this web server has an incorrect setup for logging users in.',
        },
        {
          type: 'code',
          content:
            "sql = \"SELECT note FROM users WHERE id = '%s' AND passwd = '%s'\" % (username, passwd)",
        },
        {
          type: 'text',
          content:
            "This SQL query setup allows an always-true payload. Entering an SQL attack query that is always true allows an attacker to access data they shouldn't or gain access to other's accounts.",
        },
        {type: 'heading', content: 'Attack Side'},
        {
          type: 'text',
          content:
            'To access the flag attackers can use this always-true payload to access the server and solve the challenge.',
        },
        {type: 'code', content: "'OR '1'='1"},
        {type: 'heading', content: 'Defence Side'},
        {
          type: 'text',
          content:
            'In order to defend against the vulnerability the app should prevent user input from being treated as SQL. ',
        },
        {
          type: 'code',
          content: 'sql = "SELECT note FROM users WHERE id = ? AND passwd = ?"',
        },
        {
          type: 'text',
          content:
            'The database driver does not splice username and password into the SQL string. Instead it sends the SQL template and the parameter values separately to the database engine. The DB treats those parameters purely as data, never as SQL syntax.',
        },
        {
          type: 'text',
          content:
            'To understand more about this challenge and how SQL attacks can occur, CyberBattl.es recommends this reference.',
        },
      ],
      resources: ['https://www.w3schools.com/sql/sql_injection.asp'],
    },

    {
      id: 2,
      title: 'PWN in chess',
      difficulty: 'Advanced',
      completed: true,
      attempts: 2,
      segments: [
        {type: 'text', content: 'This challenge requires root access.'},
        {type: 'code', content: 'sudo su'},
        {type: 'heading', content: 'Tips'},
        {type: 'text', content: 'Try using ls -la to check hidden files.'},
      ],
    },
    {
      id: 3,
      title: 'Accessing Root',
      difficulty: 'Intermediate',
      completed: true,
      attempts: 2,
      segments: [
        {type: 'text', content: 'This challenge requires root access.'},
        {type: 'code', content: 'sudo su'},
        {type: 'heading', content: 'Tips'},
        {type: 'text', content: 'Try using ls -la to check hidden files.'},
      ],
    },
    {
      id: 4,
      title: 'OSINT ONLY',
      difficulty: 'Beginner',
      completed: true,
      attempts: 2,
      segments: [
        {type: 'text', content: 'This challenge requires root access.'},
        {type: 'code', content: 'sudo su'},
        {type: 'heading', content: 'Tips'},
        {type: 'text', content: 'Try using ls -la to check hidden files.'},
      ],
    },
  ]);

  const solutionRefs = useRef<Record<number, HTMLDivElement | null>>({});

  const scrollToSolution = (challengeId: number) => {
    const element = solutionRefs.current[challengeId];
    if (element) {
      element.scrollIntoView({behavior: 'smooth', block: 'start'});
      // Add a highlight effect
      element.classList.add('highlight-pulse');
      setTimeout(() => {
        element.classList.remove('highlight-pulse');
      }, 2000);
    }
  };

  const completedChallenges = challenges.filter(c => c.completed);
  const incompleteChallenges = challenges.filter(c => !c.completed);
  const completionRate = Math.round(
    (completedChallenges.length / challenges.length) * 100,
  );

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Beginner':
        return 'text-green-400 bg-green-400/10';
      case 'Intermediate':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'Advanced':
        return 'text-red-400 bg-red-400/10';
      default:
        return 'text-gray-400 bg-gray-400/10';
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async user => {
      if (!user) {
        setUserClan(null);
        setteamId(null);
        setClanLoading(false);
        return;
      }

      setClanLoading(true);

      try {
        const teamsRef = collection(db, 'clans');
        const q = query(
          teamsRef,
          where('memberIds', 'array-contains', user.uid),
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const clanDoc = querySnapshot.docs[0];
          const clanData = clanDoc.data();

          setUserClan({
            id: clanDoc.id,
            ...clanData,
          });

          if (clanData.teamId) {
            setteamId(clanData.teamId);
          } else {
            setteamId(null);
          }
        } else {
          setUserClan(null);
          setteamId(null);
        }
      } catch (error) {
        console.error('Error checking user clan:', error);
        setUserClan(null);
        setteamId(null);
      } finally {
        setClanLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="min-h-screen pt-16 px-6 pb-12 text-white">
      {/* Header */}
      <div className="mb-12">
        <h1 className="text-4xl font-bold mb-3 bg-white bg-clip-text text-transparent pt-30">
          Game Performance Report
        </h1>
        <p className="text-gray-400 text-lg">
          Review challenges from your last game and improve your skills
        </p>
      </div>
      {/* Completed Challenges */}
      <div className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-2xl font-bold text-green-400">
            Completed Challenges
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {completedChallenges.map(challenge => (
            <div
              key={challenge.id}
              className="bg-gray-800/50 border border-green-500/30 rounded-lg p-5 hover:border-green-500/50 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">
                  {challenge.title}
                </h3>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white font-bold">Attempts</span>
                  <span className="text-white font-bold">
                    {challenge.attempts}
                  </span>
                </div>
                <div className="pt-2">
                  <span
                    className={`text-xs px-3 py-1 rounded-full ${getDifficultyColor(challenge.difficulty)}`}
                  >
                    {challenge.difficulty}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Incomplete Challenges */}
      <div className="mb-16">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="text-2xl font-bold text-red-400">
            Challenges to Master
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {incompleteChallenges.map(challenge => (
            <div
              key={challenge.id}
              className="bg-gray-800/50 border border-red-500/30 rounded-lg p-5 hover:border-red-500/50 transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">
                  {challenge.title}
                </h3>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white font-bold">Attempts</span>
                  <span className="text-white font-bold">
                    {challenge.attempts}
                  </span>
                </div>
                <div className="pt-2">
                  <span
                    className={`text-xs px-3 py-1 rounded-full ${getDifficultyColor(challenge.difficulty)}`}
                  >
                    {challenge.difficulty}
                  </span>
                </div>
              </div>

              <button
                onClick={() => scrollToSolution(challenge.id)}
                className="w-full bg-blue-800 text-white font-medium py-2.5 px-4 rounded-lg transition-all transform hover:scale-105 flex items-center justify-center gap-2"
              >
                Understand Solution
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Solutions Section */}
      {incompleteChallenges.length > 0 && (
        <div className="border-t border-gray-700 pt-12">
          <div className="flex items-center gap-3 mb-8">
            <h2 className="text-2xl font-bold text-white">
              Challenge Solutions & Strategies
            </h2>
          </div>

          <div className="space-y-6">
            {incompleteChallenges.map(challenge => (
              <div
                key={challenge.id}
                ref={el => {
                  solutionRefs.current[challenge.id] = el;
                }}
                className="bg-gradient-to-br from-gray-800 to-gray-800/50 border border-gray-500/30 rounded-xl p-8 scroll-mt-24 transition-all duration-500"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-white mb-2">
                      Challenge Solution
                    </h3>
                    <span
                      className={`text-xs px-3 py-1 rounded-full ${getDifficultyColor(challenge.difficulty)}`}
                    >
                      {challenge.difficulty}
                    </span>
                  </div>
                </div>

                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 mt-4">
                  <h4 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    {challenge.title}
                  </h4>
                  <div className="space-y-4">
                    {challenge.segments.map((seg, idx) => {
                      switch (seg.type) {
                        case 'text':
                          return (
                            <p
                              key={idx}
                              className="text-gray-300 leading-relaxed"
                            >
                              {seg.content}
                            </p>
                          );
                        case 'heading':
                          return (
                            <h4
                              key={idx}
                              className="text-lg font-semibold text-white"
                            >
                              {seg.content}
                            </h4>
                          );
                        case 'code':
                          return <CodeBlock key={idx} content={seg.content} />;
                        default:
                          return null;
                      }
                    })}
                    {challenge.resources && (
                      <div className="mt-8 p-6 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                        <h4 className="font-semibold text-blue-300 mb-3 flex items-center gap-2">
                          📚 Additional Resources
                        </h4>
                        <div className="space-y-2">
                          {challenge.resources.map((resource, i) => (
                            <a
                              key={i}
                              href={resource}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-blue-300 hover:text-blue-200 transition-colors underline"
                            >
                              {resource}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
