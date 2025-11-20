// app/ctf/create-team/page.tsx
'use client';

import React, {useState, useEffect} from 'react';
import {useRouter} from 'next/navigation';
import {getDocs, collection} from 'firebase/firestore';
import {db} from '@/lib/firebase';

import ApiClient from '@/components/ApiClient';
import {useAuth} from '@/components/Auth';

const CreateSession = () => {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<
    Array<{
      id: string;
      scenario_title: any;
    }>
  >([]);
  const [numTeams, setNumberTeams] = useState(2);
  const [numMembersPerTeam, setPlayersPerTeam] = useState(1);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const {currentUser} = useAuth();

  const options = scenarios.map(s => ({
    value: s.id,
    label: s.scenario_title,
  }));

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value) {
      setSelectedScenario(value);
      console.log('Selected scenario id:', value);
    } else {
      setSelectedScenario(null);
    }
  };

  useEffect(() => {
    const getScenarios = async () => {
      try {
        const scenariosRef = collection(db, 'scenarios');
        const querySnapshot = await getDocs(scenariosRef);

        // Filter out documents without scenario_title
        const filteredDocs = querySnapshot.docs.filter(
          doc => doc.data().scenario_title,
        );
        const data = filteredDocs.map(doc => ({
          id: doc.id,
          scenario_title: doc.data().scenario_title,
        }));
        data.reverse();

        setScenarios(data);
      } catch (error) {
        console.error('Failed to get scenarios', error);
      }
    };
    getScenarios();
  }, []);

  async function createSession() {
    const response = await ApiClient.post('/session', {
      scenarioId: selectedScenario,
      numTeams: numTeams,
      numMembersPerTeam: numMembersPerTeam,
      token: currentUser ? await currentUser.getIdToken() : null,
    });
    console.log(response.data);
    return response.data;
  }

  const handleCreateSession = async () => {
    setErrorMessage(null);
    setIsCreating(true);

    try {
      await createSession();
      router.push('/admin');
    } catch (error: any) {
      const message =
        error.response?.data?.message || 'Creation failed. Please try again.';
      setErrorMessage(message);
      console.error('Create session failed:', error);

      setTimeout(() => {
        setErrorMessage(null);
      }, 5000);
    } finally {
      setIsCreating(false);
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
      {/* Create Team Layout */}
      <div className="flex h-screen pt-40 bg-[#2f2f2f] text-white">
        {/* Main Content */}
        <main className="flex-1 flex flex-col items-center justify-center p-8">
          {/* Header */}
          <header className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Create Session</h1>
          </header>

          {/* Create Team Form */}
          <section className="flex flex-col items-center space-y-8">
            <div className="w-80">
              <label
                htmlFor="teamCount"
                className="block text-sm font-medium text-gray-300 mb-4"
              >
                Number of teams: {numTeams}
              </label>
              <div className="relative">
                <input
                  id="teamCount"
                  type="range"
                  min="2"
                  max="5"
                  value={numTeams}
                  onChange={e => setNumberTeams(parseInt(e.target.value))}
                  className="w-full h-2 bg-[#1e1e1e] rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-sm text-gray-400 mt-2">
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                  <span>5</span>
                </div>
              </div>
            </div>

            <div className="w-80">
              <label
                htmlFor="playerCount"
                className="block text-sm font-medium text-gray-300 mb-4"
              >
                Number of Players Per Team: {numMembersPerTeam}
              </label>
              <div className="relative">
                <input
                  id="playerCount"
                  type="range"
                  min="1"
                  max="5"
                  value={numMembersPerTeam}
                  onChange={e => setPlayersPerTeam(parseInt(e.target.value))}
                  className="w-full h-2 bg-[#1e1e1e] rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-sm text-gray-400 mt-2">
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                  <span>4</span>
                  <span>5</span>
                </div>
              </div>
            </div>

            <div className="w-80">
              <select
                id="scenario"
                value={selectedScenario || ''}
                onChange={handleChange}
                className="w-full p-4 bg-white text-l text-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:border-blue-400"
              >
                <option value="" disabled className="text-gray-500">
                  Select scenario name
                </option>

                {options.map(option => (
                  <option
                    key={option.value}
                    value={option.value}
                    className="p-4 text-l"
                  >
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col items-center space-y-4">
              <button
                className={`cursor-pointer w-80 h-[60px] flex items-center justify-center py-4 px-8 bg-[#2f2f2f] border rounded-2xl transition font-bold shadow-md ${
                  errorMessage
                    ? 'border-red-500 text-red-400'
                    : 'border-gray-600 hover:border-blue-400 hover:bg-[#3a3a3a]'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                onClick={handleCreateSession}
                disabled={isCreating}
              >
                {isCreating ? (
                  <svg
                    className="animate-spin h-6 w-6 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                ) : errorMessage ? (
                  <span className="text-sm text-center">{errorMessage}</span>
                ) : (
                  <span className="text-xl">Create</span>
                )}
              </button>
              <button
                className="cursor-pointer w-80 py-3 px-8 bg-gray-600 rounded-2xl hover:opacity-90 transition font-semibold text-lg shadow-md"
                onClick={handleBackToSelection}
              >
                Back to Selection
              </button>
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
          border: 2px solid #1e1e1e;
        }

        .slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: #3b82f6;
          cursor: pointer;
          border: 2px solid #1e1e1e;
        }

        .slider::-webkit-slider-track {
          background: #1e1e1e;
          border-radius: 5px;
        }

        .slider::-moz-range-track {
          background: #1e1e1e;
          border-radius: 5px;
        }
      `}</style>
    </>
  );
};

export default CreateSession;
