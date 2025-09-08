'use client';

import Navbar from "@/components/Navbar";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import React, { useEffect, useRef, useState } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

export default function Shell() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isTerminalInitialized, setIsTerminalInitialized] = useState(false);
  const isMountedRef = useRef(false);

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
    if (!terminalRef.current || !isMountedRef.current || xtermRef.current) return;

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
    
    try {
      term.loadAddon(fitAddon);
      fitAddonRef.current = fitAddon;
      term.open(terminalRef.current);
      xtermRef.current = term;
      
      // Initialize WebSocket connection
      initWebSocketConnection(term);
      
      if (isMountedRef.current) {
        setIsTerminalInitialized(true);
      }
    } catch (error) {
      console.error("Terminal initialization error:", error);
    }

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
      const token = "eyJhbGciOiJSUzI1NiIsImtpZCI6ImVmMjQ4ZjQyZjc0YWUwZjk4OTIwYWY5YTlhMDEzMTdlZjJkMzVmZTEiLCJ0eXAiOiJKV1QifQ.eyJuYW1lIjoiQk1XIiwiaXNzIjoiaHR0cHM6Ly9zZWN1cmV0b2tlbi5nb29nbGUuY29tL2N5YmVyYmF0dGxlcy1kZDMxZiIsImF1ZCI6ImN5YmVyYmF0dGxlcy1kZDMxZiIsImF1dGhfdGltZSI6MTc1NzMwNDcxOSwidXNlcl9pZCI6ImJwMFlPNWY3WnpTYnJZbTVKRUpvWHNuZG03cDEiLCJzdWIiOiJicDBZTzVmN1p6U2JyWW01SkVKb1hzbmRtN3AxIiwiaWF0IjoxNzU3MzA0ODMwLCJleHAiOjE3NTczMDg0MzAsImVtYWlsIjoidG9tdGVzdEBnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6ZmFsc2UsImZpcmViYXNlIjp7ImlkZW50aXRpZXMiOnsiZW1haWwiOlsidG9tdGVzdEBnbWFpbC5jb20iXX0sInNpZ25faW5fcHJvdmlkZXIiOiJwYXNzd29yZCJ9fQ.lJXguh5EEMwYVhr-HIBgE2MwpmZbsKnjZ7fm8IQmj8gQMXHhxA49Fd8sE9y-Vk5z7KatVzfDmEjqAhQXJE9_ClgzI_E8NTCXHZ4oAHaKIGmHuuKzPEiMLZOHMKp5VIIoF2hoNBmDVxUe_uWRoXZwl-XsrcpWf30YtHuJ1bnxcmiycSuUCN0CtvYw0Nov4xe2FEOqcueKNxv4ORDGmTMbf4DuWXoGXBiibEVtrzqIPwEmZpLbWYvQpFDx997fgQnWTghWyh-PrdazjjnkyVed7gwKp-dBk4lbBQf6mrDuQ2utyo-esffOJ74wh_2mNllQFhhoDBxsDIOR--6kFVBLmA";
      const teamId = "07249a5056678c63";
      const userId = currentUser?.uid || "bp0YO5f7ZzSbrYm5JEJoXsndm7p1";
      
      term.writeln(`Connecting to terminal...\r\n`);
      term.writeln(`Team: ${teamId}, User: ${userId}\r\n`);
  
      const ws = new WebSocket(
        `ws://${window.location.host}/terminals/${teamId}/${userId}/${token}`
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
        term.writeln(`\r\n\x1b[31mConnection closed: ${event.code} - ${event.reason || 'No reason provided'}\x1b[0m`);
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