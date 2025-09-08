'use client';

// REF: https://claude.ai/chat/599256c2-bde2-40df-8ad5-3acb29f3ecae
// REF: https://www.qovery.com/blog/react-xtermjs-a-react-library-to-build-terminals/
// REF: https://www.npmjs.com/package/xterm-for-react
// REF: https://www.tkcnn.com/github/xtermjs/xterm.js.html
// REF: https://chatgpt.com/c/68b93e97-0f38-832f-a207-b02b0dc4eef6
// REF: https://chatgpt.com/c/68beb1a6-1bd0-832f-87b6-5e5e8d36dcdb

import Navbar from "@/components/Navbar";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";
import { getAuth } from "firebase/auth"
import { db } from "../../lib/firebase";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";

export default function Shell() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<any | null>(null);
  const fitAddonRef = useRef<any | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isTerminalInitialized, setIsTerminalInitialized] = useState(false);
  const [currentTeam, setCurrentTeam] = useState("");
  const [currentUsername, setCurrentUserName] = useState("");
  const isMountedRef = useRef(false);
  const auth = getAuth();
  
  // Track component mount status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Close WebSocket on unmount
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  // Get username and team names
  const fetchTeamById = async (teamUid: string) => {
    const teamRef = doc(db, "teams", teamUid);
    const teamSnap = await getDoc(teamRef);
  
    if (teamSnap.exists()) {
      const teamData = teamSnap.data();
      return teamData.name;
    } else {
      console.warn("No such team!");
      return null;
    }
  };

  // Get username and team names
  const fetchUsernameById = async (userUid: string) => {
    const userRef = doc(db, "login", userUid);
    const userSnap = await getDoc(userRef);
  
    if (userSnap.exists()) {
      const userData = userSnap.data();
      return userData.userName;
    } else {
      console.warn("No such user!");
      return null;
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (isMountedRef.current) {
        setCurrentUser(user);
      }
    });

    return () => unsubscribe();
  }, []);

  // Initialize terminal and WebSocket connection
  useEffect(() => {
    // Only proceed if the ref is available and component is mounted
    if (!terminalRef.current || !isMountedRef.current || xtermRef.current) return;

    // Use a function to handle the async import and initialization
    const initializeTerminal = async () => {
      try {
        // Dynamically import the browser-only libraries inside the hook
        const { Terminal } = await import("xterm");
        const { FitAddon } = await import("xterm-addon-fit");

        const term = new Terminal({
          cursorBlink: true,
          fontSize: 14,
          fontFamily: 'Consolas, "Liberation Mono", Menlo, Courier, monospace',
          theme: {
            background: '#1a1a1a',
            foreground: '#f0f0f0',
            cursor: '#ffffff',
          },
        });

        const fitAddon = new FitAddon();

        term.loadAddon(fitAddon);
        fitAddonRef.current = fitAddon;
        
        if (terminalRef.current) {
          term.open(terminalRef.current);
        }

        xtermRef.current = term;
        
        // Initialize WebSocket connection
        initWebSocketConnection(term);
        
        if (isMountedRef.current) {
          setIsTerminalInitialized(true);
        }
      } catch (error) {
        console.error("Terminal initialization error:", error);
      }
    };

    initializeTerminal();

    return () => {
      if (xtermRef.current) {
        try {
          xtermRef.current.dispose();
        } catch (e) {
          console.log("Terminal disposal error:", e);
        }
        xtermRef.current = null;
      }
      fitAddonRef.current = null;
      setIsTerminalInitialized(false);
      setIsConnected(false);
    };
  }, []);


  // WebSocket connection function
  const initWebSocketConnection = async (term: Terminal) => {
    try {
      const token = "eyJhbGciOiJSUzI1NiIsImtpZCI6ImVmMjQ4ZjQyZjc0YWUwZjk0OTIwYWY5YTlhMDEzMTdlZjJkMzVmZTEiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiQk1XIiwiaXNzIjoiaHR0cHM6Ly9zZWN1cmV0b2tlbi5nb29nbGUuY29tL2N5YmVyYmF0dGxlcy1kZDMxZiIsImF1ZCI6ImN5YmVyYmF0dGxlcy1kZDMxZiIsImF1dGhfdGltZSI6MTc1NzMyMDUwNSwidXNlcl9pZCI6ImJwMFlPNWY3WnpTYnJZbTVKRUpvWHNuZG03cDEiLCJzdWIiOiJicDBZTzVmN1p6U2JyWW01SkVKb1hzbmRtN3AxIiwiaWF0IjoxNzU3MzI1OTI3LCJleHAiOjE3NTczMjk1MjcsImVtYWlsIjoidG9tdGVzdEBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZW1haWwiOlsidG9tdGVzdEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJwYXNzd29yZCJ9fQ.hqJ_CNdv4NyD_3k7Hpc-JwmxDIx650QIlt1f6eKmSJhJJYbH_NIN8f6P648aW7wG5J-au_yoIpc0bWfrOiIzmbBfrjrOSkrJ-h1IJX21zPsCTZHiUKylOCSZKoc9cGzpBCyDalOaFkZ4w8tDfsm--6tg0nJRIivnaDoc_TfGz5SgFvOfx1aCju4SuBV49PNc0ey8MijwSXnsylCP9tusdEiosmfRW__2vkY8kMCx7_8-fQPoJG7xYHum0Y6SwR4bggk1sKBNb4GCKiMr3pYodVh9XZgluSaSQyK0HdSireBQmd9dkfbs8nBjPFV30eTAO2uMmCvVK3mJss7jroVMZg";
      const teamId = "44290c3f9208b031";
      const userId = currentUser?.uid || "bp0YO5f7ZzSbrYm5JEJoXsndm7p1";

      const teamName = await fetchTeamById(teamId);
      const userName = await fetchUsernameById(userId);
      
      term.writeln(`Connecting to terminal...\r\n`);
      term.writeln(`Team Id: ${teamId} Team Name: ${teamName}, User Id: ${userId}, User Name: ${userName}\r\n`);
  
      const host = "localhost:1337"; 
      const ws = new WebSocket(
      `ws://${host}/terminals/${teamId}/${userId}/${token}`
      );
      
      wsRef.current = ws;
  
      const connectionTimeout = setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          console.error("WebSocket connection timeout - still connecting");
          term.writeln("\r\n\x1b[31mConnection timeout - server not responding\x1b[0m");
          ws.close();
        }
      }, 5000); 
  
      ws.onopen = () => {
        clearTimeout(connectionTimeout);
        if (!isMountedRef.current) return;
        setIsConnected(true);
        term.writeln("\x1b[32mConnected to terminal server!\x1b[0m\r\n");
        term.writeln("\x1b[33mType commands to interact with the system...\x1b[0m\r\n");
        
        setTimeout(() => {
          if (fitAddonRef.current) {
            fitAddonRef.current.fit();
          }
        }, 100);
      };
  
      ws.onmessage = async (event) => {
        if (!isMountedRef.current) return;
        
        if (event.data instanceof Blob) {
          const arrayBuffer = await event.data.arrayBuffer();
          const data = new Uint8Array(arrayBuffer);
          term.write(data);
        } else {
          term.write(event.data);
        }
      };
  
      ws.onclose = (event) => {
        clearTimeout(connectionTimeout);
        if (!isMountedRef.current) return;
        setIsConnected(false);
        console.log("WebSocket closed:", event.code, event.reason);
        term.writeln(`\r\n\x1b[31mConnection closed: ${event.code} - ${event.reason || 'Make sure backend is running.'}\x1b[0m`);
      };
  
      ws.onerror = (error) => {
        clearTimeout(connectionTimeout);
        if (!isMountedRef.current) return;
        console.error("WebSocket error:", error);
        term.writeln("\r\n\x1b[31mWebSocket connection error.\x1b[0m");
      };
  
      term.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });
  
    } catch (err) {
      console.error("Connection error:", err);
    }
  };

  // Handle resize
  useEffect(() => {
    if (!isTerminalInitialized || !fitAddonRef.current) return;

    const handleResize = () => {
      if (fitAddonRef.current && isMountedRef.current) {
        try {
          fitAddonRef.current.fit();
        } catch (e) {
          console.log("Resize error:", e);
        }
      }
    };
    
    // Initial fit
    const initialFitTimeout = setTimeout(handleResize, 100);
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(initialFitTimeout);
    };
  }, [isTerminalInitialized]);

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      backgroundColor: '#1a1a1a',
      fontFamily: 'Arial, sans-serif'
    }}>
      <Navbar />
      
      <div style={{
        padding: '65px',
        color: 'white',
        backgroundColor: '#2c3e50',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <div style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: isConnected ? '#2ecc71' : '#e74c3c'
        }}></div>
        <span>Web Terminal {isConnected ? '- Connected' : '- Connecting...'}</span>
        {currentUser && (
          <span style={{ marginLeft: 'auto', fontSize: '14px' }}>
            User: {currentUser.displayName || currentUser.email}
          </span>
        )}
      </div>
      
      <div 
        ref={terminalRef} 
        style={{ 
          flex: 1,
          padding: '10px',
          overflow: 'hidden',
          minHeight: 0
        }}
      />
      
      <div style={{
        padding: '10px 16px',
        backgroundColor: '#2c3e50',
        color: 'white',
        fontSize: '14px',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <span>Web Terminal v1.0</span>
        <span>All input is sent via WebSocket</span>
      </div>
    </div>
  );
}