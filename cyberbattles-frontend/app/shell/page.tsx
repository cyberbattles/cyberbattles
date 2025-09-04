'use client';

// REF: https://claude.ai/chat/599256c2-bde2-40df-8ad5-3acb29f3ecae
// REF: https://www.qovery.com/blog/react-xtermjs-a-react-library-to-build-terminals/
// REF: https://www.npmjs.com/package/xterm-for-react
// REF: https://www.tkcnn.com/github/xtermjs/xterm.js.html
// REF: https://chatgpt.com/c/68b93e97-0f38-832f-a207-b02b0dc4eef6

import Navbar from "@/components/Navbar";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User } from "firebase/auth";
import React, { useEffect, useRef, useState } from "react";
import { MdOutlineSignalWifiStatusbarConnectedNoInternet4 } from "react-icons/md";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import "xterm/css/xterm.css";

export default function Shell() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isTerminalInitialized, setIsTerminalInitialized] = useState(false);
  const isMountedRef = useRef(false);

  // Track component mount status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
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

  // Initialize terminal with proper cleanup
  useEffect(() => {
    if (!terminalRef.current || !isMountedRef.current) return;
    
    // Don't initialize if already initialized
    if (xtermRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Consolas, "Liberation Mono", Menlo, Courier, monospace',
      theme: {
        background: '#1a1a1a',
        foreground: '#f0f0f0',
        cursor: '#ffffff',
      },
      rows: 30,
      cols: 100
    });
    
    const fitAddon = new FitAddon();
    
    try {
      term.loadAddon(fitAddon);
      fitAddonRef.current = fitAddon;
      
      // Open terminal
      term.open(terminalRef.current);
      xtermRef.current = term;
      
      if (isMountedRef.current) {
        setIsTerminalInitialized(true);
      }
    } catch (error) {
      console.error("Terminal initialization error:", error);
    }

    return () => {
      // Proper cleanup
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
  }, []); // Only run once

  // Handle resize with better error handling
  useEffect(() => {
    if (!isTerminalInitialized || !fitAddonRef.current || !isMountedRef.current) return;

    const handleResize = () => {
      if (!fitAddonRef.current || !xtermRef.current || !isMountedRef.current) return;
      
      // Check if terminal container still exists
      if (!terminalRef.current?.isConnected) return;
      
      try {
        // Use requestAnimationFrame to ensure DOM is ready
        requestAnimationFrame(() => {
          if (fitAddonRef.current && xtermRef.current && isMountedRef.current) {
            fitAddonRef.current.fit();
          }
        });
      } catch (e) {
        console.log("Resize error:", e);
      }
    };
    
    // Use requestAnimationFrame for initial fit
    const initialFitTimeout = setTimeout(() => {
      if (isMountedRef.current) {
        handleResize();
      }
    }, 100);
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(initialFitTimeout);
    };
  }, [isTerminalInitialized]);

  // Write content when terminal is ready
  useEffect(() => {
    if (!isTerminalInitialized || !xtermRef.current || !isMountedRef.current) return;
    
    const term = xtermRef.current;
    
    // Double-check terminal is still valid
    if (!term || !terminalRef.current?.isConnected) return;
    
    try {
      // Clear any existing content
      term.clear();
      
      const username = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'user';
      term.writeln('\x1b[32mWelcome to the CyberBattles Web Terminal!\x1b[0m');
      term.writeln('\x1b[32mType commands to interact with the system...\x1b[0m');
      term.writeln('');
      term.write(`\x1b[33m${username}@cyber-battles:~$ \x1b[0m`);

      if (isMountedRef.current) {
        setIsConnected(true);
      }
      

      // Refit after content with proper checks
      setTimeout(() => {
        if (fitAddonRef.current && xtermRef.current && isMountedRef.current && terminalRef.current?.isConnected) {
          try {
            fitAddonRef.current.fit();
          } catch (e) {
            console.log("Fit error after content:", e);
          }
        }
      }, 200);
    } catch (error) {
      console.error("Error writing to terminal:", error);
    }
  }, [isTerminalInitialized, currentUser]);

  useEffect(() => {
    if (!isTerminalInitialized || !xtermRef.current || !currentUser) return;
    
    const term = xtermRef.current;
    const username = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'user';
    
    let inputBuffer = '';
  
    const handleKey = (e: { key: string }) => {
      const char = e.key;
  
      if (char === '\r') {
        term.writeln('');
        term.writeln(inputBuffer);
        // Handle backend here
        inputBuffer = '';
        term.write(`\x1b[33m${username}@cyber-battles:~$ \x1b[0m`);
      } else if (char === '\u007f') {
        if (inputBuffer.length > 0) {
          inputBuffer = inputBuffer.slice(0, -1);
          term.write('\b \b');
        }
      } else {
        const singleChar = char[0];
        inputBuffer += singleChar;
        term.write(singleChar);
      }
    };
  
    term.onKey(handleKey);
    
  }, [isTerminalInitialized, currentUser]);

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
        <span>Press Enter to execute commands</span>
      </div>
    </div>
  );
}