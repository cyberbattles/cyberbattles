'use client';
import React, {useState, useEffect} from 'react';
import {auth,db} from '@/lib/firebase';
import {signOut} from 'firebase/auth';
import {useRouter} from 'next/navigation';
import PcapViewer from '@/components/PcapViewer';
import {
  collection,
  query,
  where,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
} from 'firebase/firestore';

import ApiClient from '@/components/ApiClient';
import {useAuth} from '@/components/Auth';



// REF: Utilised Claude.
// https://claude.ai/chat/127e4c5b-7157-442a-b689-8faa363fa40d


const NetworkTraffic = () => {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileUrl, setFileUrl] = useState(null);
  const [pcapFiles, setPcapFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('upload'); // 'upload' or 'viewer'
  const [, setJwt] = useState<string | null>(null);
  const {currentUser} = useAuth();
  const [teamId, setTeamId] = useState<string>('');
  const [pcapBlobUrl, setPcapBlobUrl] = useState<string | null>(null);

  
  // TODO: call firebase get teamid and token of user. 
  // TODO: call api to get pcap file on page refresh. 
  // if it doesnt work we need to enforce only loading once the file exists? i.e. when game ends maybe?
  

 useEffect(() => {
  const fetchJwt = async () => {
    if (currentUser) {
      try {
        const token = await currentUser.getIdToken(true);
        setJwt(token);
        localStorage.setItem('token', token);
        return token;
      } catch (error) {
        console.error("Failed to get jwt:", error);
        setJwt(null);
        return null;
      }
    } else {
      console.log("No user is signed in.");
      setJwt(null);
      return null;
    }
  };

  const fetchTeamId = async () => {
    if (currentUser) {
      try {
        const teamsRef = collection(db, 'teams');
        const teamsSnap = await getDocs(teamsRef);
        let userTeamId = '';
        
        for (const teamDoc of teamsSnap.docs) {
          const teamData = teamDoc.data();
          if (Array.isArray(teamData.memberIds) && 
              teamData.memberIds.includes(currentUser.uid)) {
            userTeamId = teamDoc.id;
            break;
          }
        }
        
        setTeamId(userTeamId);
        if (!userTeamId) {
          console.warn("User not found in any team");
        }
        return userTeamId;
      } catch (error) {
        console.error("Error fetching team:", error);
        setTeamId('');
        return null;
      }
    } else {
      setTeamId('');
      return null;
    }
  };

 const fetchPcapFiles = async (id) => {
  if (!id) {
    console.warn("Cannot fetch PCAP files: teamId is empty");
    return;
  }
  
  setLoading(true);
  try {
    const jwt = localStorage.getItem('token');
    if (!jwt) {
      console.warn("No JWT token available");
      return;
    }
    
    const response = await fetch(
      `https://cyberbattl.es/api/captures/${id}/${jwt}?t=${new Date().getTime()}`
    );
    
    if (response.ok) {
      // Check the response type to handle blob or JSON
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        // If it's JSON, parse and set files list
        const data = await response.json();
        setPcapFiles(data.files || data || []);
      } else {
        // If it's a blob (the actual PCAP file), create object URL
        const pcapBlob = await response.blob();
        
        // Revoke old URL if it exists
        if (pcapBlobUrl) {
          URL.revokeObjectURL(pcapBlobUrl);
        }
        
        // Create new URL and set it
        const newBlobUrl = URL.createObjectURL(pcapBlob);
        setPcapBlobUrl(newBlobUrl);
        setFileUrl(newBlobUrl);
      }
    } else {
      console.error("Failed to fetch PCAP files:", response.status);
      setError(`Failed to fetch PCAP files: ${response.status}`);
    }
  } catch (error) {
    console.error("Error fetching PCAP files:", error);
    setError("Error fetching PCAP files");
  } finally {
    setLoading(false);
  }
};

  // Run all fetches in sequence
  const runFetches = async () => {
    const token = await fetchJwt();
    const teamIdResult = await fetchTeamId();
    if (teamIdResult) {
      await fetchPcapFiles(teamIdResult);
    }
  };

  runFetches();
}, [currentUser]); // Only depend on currentUser

  async function getUser(uid:any) {
    let ret = null;
    try {
      const docRef = doc(db, 'login', 'uid');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        ret = docSnap.data();
      }
    }
    catch (error) {
      console.log('Failed', error);
    }
    return ret;
  }  

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.pcap')) {
        setError('Please select a valid .pcap file');
        return;
      }
      setError(null);
      setSelectedFile(file);

      // Create blob URL for immediate preview
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      setActiveView('viewer');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setUploadProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch('/api/upload-pcap', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setUploadProgress(100);
        fetchPcapFiles();
        setTimeout(() => setUploadProgress(0), 1000);
      } else {
        setError('Upload failed. Please try again.');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Upload failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectFromList = (file) => {
    setError(null);
    setFileUrl(file.url);
    setSelectedFile({name: file.name});
    setActiveView('viewer');
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <div className="flex h-screen pt-40 bg-[#2f2f2f] text-white">
      {/* Sidebar */}
      <div className="w-80 bg-[#1e1e1e] shadow-md flex flex-col">


        <nav className="p-6 space-y-4 flex-1 overflow-auto">
          {/* Upload Section */}
          <div className="space-y-3">
            <div className="text-sm text-gray-400 mb-2">Upload PCAP File</div>

            <label className="block">
              <div className="flex items-center justify-center w-full h-32 px-4 transition bg-[#2f2f2f] border-2 border-gray-600 border-dashed rounded-lg cursor-pointer hover:border-blue-500">
                <div className="text-center">
                  <svg
                    className="w-8 h-8 mx-auto text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <p className="mt-2 text-sm text-gray-400">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">.pcap files only</p>
                </div>
              </div>
              <input
                type="file"
                accept=".pcap"
                onChange={handleFileSelect}
                className="hidden"
              />
            </label>

            {selectedFile && (
              <div className="text-sm text-gray-300 bg-[#2f2f2f] p-2 rounded">
                Selected: {selectedFile.name}
              </div>
            )}

            {uploadProgress > 0 && (
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{width: `${uploadProgress}%`}}
                />
              </div>
            )}

            {error && <div className="text-sm text-red-400">{error}</div>}

            {selectedFile && !fileUrl && (
              <button
                onClick={handleUpload}
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 rounded-lg hover:opacity-90 transition font-semibold disabled:opacity-50"
              >
                {loading ? 'Uploading...' : 'Upload to Server'}
              </button>
            )}
          </div>

          {/* Available Files */}
          
        </nav>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex justify-between items-center p-6 border-b border-gray-700">
          <div>
            <h1 className="text-2xl font-bold">Network Traffic Analysis</h1>
            {selectedFile && (
              <p className="text-sm text-gray-400 mt-1">
                Viewing: {selectedFile.name}
              </p>
            )}
          </div>
          <div className="flex gap-4 items-center">
            
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-blue-600 rounded-xl hover:opacity-90 transition font-bold"
            >
              Logout
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {fileUrl ? (
            <div className="h-full overflow-auto p-6">
              <PcapViewer
                src={fileUrl}
                lang="en-us"
                enableHexToggle
                showFullscreenBtn
                useCanvas
              />
            </div>
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center text-gray-400 p-8 max-w-md">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-gray-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <div className="text-xl font-semibold mb-2">
                  No PCAP File Selected
                </div>
                <div className="text-sm">
                  Select a session to view traffic.
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default NetworkTraffic;