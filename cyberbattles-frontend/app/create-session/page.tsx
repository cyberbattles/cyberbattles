// app/ctf/create-team/page.tsx
'use client';

import React, {useState, useEffect} from 'react';
import {useRouter} from 'next/navigation';
import Select, {SingleValue} from 'react-select';
import {getDocs, collection} from 'firebase/firestore';
import {db} from '@/lib/firebase';

import ApiClient from '@/components/ApiClient';
import {useAuth} from '@/components/Auth';

interface ScenarioOption {
  value: string;
  label: string;
}

const CreateSession = () => {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<
    Array<{
      id: string;
      scenario_description: any;
      scenario_difficulty: any;
      scenario_title: any;
      timestamp: any;
      zipData: any;
    }>
  >([]);
  const [, setJwt] = useState<string | null>(null);
  const [, setShowJwt] = useState(false);
  const [numTeams, setNumberTeams] = useState(2);
  const [numMembersPerTeam, setPlayersPerTeam] = useState(1);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const {currentUser} = useAuth();

  const options = scenarios.map(s => ({
    value: s.id,
    label: s.scenario_title,
  }));

  const handleChange = (option: SingleValue<ScenarioOption>) => {
    if (option) {
      setSelectedScenario(option.value);
      console.log('Selected scenario id:', option.value);
    } else {
      setSelectedScenario(null);
    }
  };

  useEffect(() => {
    // grab available scenarios when page load

    const getScenarios = async () => {
      try {
        const scenariosRef = collection(db, 'scenarios');
        const querySnapshot = await getDocs(scenariosRef);

        const data = querySnapshot.docs.map(doc => ({
          // We don't really need all these fields but it's there if I decide
          // to update this page to give more info in the creation process.
          id: doc.id,
          scenario_description: doc.data().scenario_description,
          scenario_difficulty: doc.data().scenario_difficulty,
          scenario_title: doc.data().scenario_title,
          timestamp: doc.data().timestamp,
          zipData: doc.data().zipData,
        }));

        const scenarioOptions = scenarios.map(s => ({
          value: s.id,
          label: s.scenario_title,
        }));

        setScenarios(data);
      } catch (error) {
        console.error('Failed to get scenarios', error);
      }
    };

    getScenarios();
  }, []);

  useEffect(() => {
    const fetchJwt = async () => {
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken(true);
          setJwt(token);
          localStorage.setItem('token', token);
          setShowJwt(true);
        } catch (error) {
          console.error('Failed to get JWT:', error);
          setJwt('Could not retrieve token.');
          setShowJwt(true);
        }
      } else {
        console.error('No user is signed in.');
        setJwt(null);
        setShowJwt(false);
      }
    };

    fetchJwt();
  }, [currentUser]);

  async function createSession() {
    const response = await ApiClient.post('/session', {
      scenarioId: selectedScenario,
      numTeams: numTeams,
      numMembersPerTeam: numMembersPerTeam,
      token: localStorage.getItem('token'),
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
      {/* Fixed Navbar */}

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

            <div className="w-80 text-black">
              <Select<ScenarioOption, false>
                options={options}
                onChange={handleChange}
                placeholder="Select scenario name"
              />
            </div>

            <div className="flex flex-col items-center space-y-4">
              <button
                className={`w-80 h-[60px] flex items-center justify-center py-4 px-8 bg-[#2f2f2f] border rounded-2xl transition font-bold shadow-md ${
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
                className="w-80 py-3 px-8 bg-gray-600 rounded-2xl hover:opacity-90 transition font-semibold text-lg shadow-md"
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
