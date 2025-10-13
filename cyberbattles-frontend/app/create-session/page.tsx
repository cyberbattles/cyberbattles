// app/ctf/create-team/page.tsx
'use client';

import React, {useState, useEffect} from 'react';
import {useRouter} from 'next/navigation';

import Select, {SingleValue} from 'react-select';

import {
  getDocs,
  updateDoc,
  arrayUnion,
  collection,
  query,
  onSnapshot,
} from 'firebase/firestore';
import {auth, db} from '@/lib/firebase';
import {onAuthStateChanged, User} from 'firebase/auth';

import ApiClient from '@/components/ApiClient';

interface Scenario {
  id: string;
  scenario_title: string;
}

interface ScenarioOption {
  value: string;
  label: string;
}

// TODO: Call firebase to get aavailable scenarios

// NOTE: Not implemented modularity for multiple scenarios on the backend yet.
// For now just only setting up the basic scenario 'ubuntu-latest'

const CreateSession = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
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
  const [jwt, setJwt] = useState<string | null>(null);
  const [showJwt, setShowJwt] = useState(false);
  const [numTeams, setNumberTeams] = useState(2);
  const [numMembersPerTeam, setPlayersPerTeam] = useState(1);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

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
        setLoading(true);
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
        console.log(data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to get scenarios', error);
      }
    };

    getScenarios();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        try {
          const token = await user.getIdToken(true);
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
    });

    // Cleanup subscription when component unmounts
    return () => unsubscribe();
  }, []);

  async function createSession() {
    try {
      const response = await ApiClient.post('/session', {
        scenarioId: selectedScenario,
        numTeams: numTeams,
        numMembersPerTeam: numMembersPerTeam,
        token: localStorage.getItem('token'),
      });
      console.log(response.data);
      return response.data;
    } catch (error) {
      console.error('Error creating session:', error);
    }
  }

  const handleCreateSession = async () => {
    try {
      await createSession();
      router.push('/admin');
    } catch (error) {
      console.error('Create session failed:', error);
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
                className="w-80 py-4 px-8 bg-[#2f2f2f] border border-gray-600 rounded-2xl hover:border-blue-400 hover:bg-[#3a3a3a] transition font-bold text-xl shadow-md"
                onClick={handleCreateSession}
              >
                Create
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
