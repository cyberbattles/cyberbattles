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
// https://claude.ai/share/33adf08e-559c-4409-9267-2454ba3bbebf



const NetworkTraffic = () => {
  const router = useRouter();
  const [fileUrl, setFileUrl] = useState('');
  const [, setJwt] = useState<string | null>(null);
  const {currentUser} = useAuth();
  const [teamId, setTeamId] = useState<string>('');
  const [pcapBlobUrl, setPcapBlobUrl] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  
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



  // Run all fetches in sequence
  const runFetches = async () => {
    const teamIdResult = await fetchTeamId();
    if (teamIdResult) {
      setTeamId(teamIdResult);
      if (!teamIdResult) {
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
          `https://cyberbattl.es/api/captures/${teamIdResult}/${jwt}?t=${new Date().getTime()}`
        );
        
        if (response.ok) {
          const pcapBlob = await response.blob();
          
          if (pcapBlobUrl) {
            URL.revokeObjectURL(pcapBlobUrl);
          }
          
          const newBlobUrl = URL.createObjectURL(pcapBlob);
          setPcapBlobUrl(newBlobUrl);
          setFileUrl(newBlobUrl);
        } else {
          console.error("Failed to fetch PCAP files:", response.status);
        }
      } catch (error) {
        console.error("Error fetching PCAP files:", error);
      }
    }
  };

  runFetches();
}, [currentUser]);  

  const handlePcapDownload = () => {
  if (!pcapBlobUrl) {
    console.warn("No PCAP file available");
    return;
  }

  const link = document.createElement('a');
  link.href = pcapBlobUrl;
  link.download = 'capture.pcap';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

  const handleRefresh = async () => {
    if (!teamId) {
      console.warn("Cannot refresh: teamId is empty");
      return;
    }
    
    try {
      const jwt = localStorage.getItem('token');
      if (!jwt) {
        console.warn("No JWT token available");
        return;
      }
      
      const response = await fetch(
        `https://cyberbattl.es/api/captures/${teamId}/${jwt}?t=${new Date().getTime()}`
      );
      
      if (response.ok) {
        const pcapBlob = await response.blob();
        
        if (pcapBlobUrl) {
          URL.revokeObjectURL(pcapBlobUrl);
        }
        
        const newBlobUrl = URL.createObjectURL(pcapBlob);
        setPcapBlobUrl(newBlobUrl);
        setFileUrl(newBlobUrl);
        setRefreshKey(prev => prev + 1);
      } else {
        setFileUrl('');
        console.error("Failed to fetch PCAP files:", response.status);
      }
    } catch (error) {
      setFileUrl('');
      console.error("Error fetching PCAP files:", error);
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

          <div className="flex gap-8 items-center">

            <button
              onClick={handlePcapDownload}
              className="px-4 py-2 bg-blue-600 rounded-xl hover:opacity-90 transition font-bold"
            >
              Download .pcap file
            </button>
            
            <button
              onClick={handleRefresh}
              className="px-4 py-2 bg-blue-500 rounded-xl hover:opacity-90 transition font-bold"
            >
              Refresh
            </button>
          </div>

        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-hidden">
          {fileUrl ? (
            <div className="h-full overflow-auto p-6">
              <PcapViewer
                key={refreshKey}
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