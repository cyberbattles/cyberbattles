'use client';
import React, {useState, useEffect} from 'react';
import {auth,db} from '@/lib/firebase';
import {signOut} from 'firebase/auth';
import {useRouter} from 'next/navigation';
import PcapViewer from '@/components/PcapViewer';
import {
  collection,
  getDocs,
} from 'firebase/firestore';

import {useAuth} from '@/components/Auth';
import Image from 'next/image';

import WarningIcon from "@/public/images/warning.png";



// REF: Utilised Claude.
// https://claude.ai/share/501c44f9-ec4a-4796-98af-d68a16c36f78


const NetworkTraffic = () => {
  const router = useRouter();
  const [fileUrl, setFileUrl] = useState('');
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
      console.log("No user is signed in...");
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

 const fetchPcapFiles = async (id: string) => {
  if (!id) {
    console.warn("Cannot fetch PCAP files: teamId is empty");
    return;
  }
  
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
      
    } else {
      console.error("Failed to fetch PCAP files:", response.status);
    }
  } catch (error) {
    console.error("Error fetching PCAP files:", error);
  } finally {
    return;
  }
};

  // Run all fetches in sequence
  const runFetches = async () => {
    const teamIdResult = await fetchTeamId();
    if (teamIdResult) {
      await fetchPcapFiles(teamIdResult);
    }
  };

  runFetches();
}, [currentUser]);  

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
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex justify-between items-center p-6 border-b border-gray-700">
          <div>
            <h1 className="text-2xl font-bold">Network Traffic Analysis</h1>
            
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
              <div className="text-center text-gray-400 p-8 w-100">
                <Image src={WarningIcon}
                alt = "Triangular warning icon"/>
                <div className="text-xl font-semibold mb-2 text-[#c12f2f]">
                  Unable to get network traffic. Ensure you are in an active game.
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