'use client';

// REF: https://claude.ai/chat/599256c2-bde2-40df-8ad5-3acb29f3ecae
// REF: https://www.qovery.com/blog/react-xtermjs-a-react-library-to-build-terminals/
// REF: https://www.npmjs.com/package/xterm-for-react
// REF: https://www.tkcnn.com/github/xtermjs/xterm.js.html
// REF: https://chatgpt.com/c/68b93e97-0f38-832f-a207-b02b0dc4eef6
// REF: https://chatgpt.com/share/68d9cb25-aecc-8008-91cb-1ce122b78793

import {auth, db} from '@/lib/firebase';
import {onAuthStateChanged, User} from 'firebase/auth';
import React, {useEffect, useRef, useState} from 'react';
import {Terminal} from 'xterm';
import {FitAddon} from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import FlagPopup from '@/components/FlagPopup';
import {collection, doc, getDoc, getDocs} from 'firebase/firestore';

export default function Shell() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isTerminalInitialized, setIsTerminalInitialized] = useState(false);
  const isMountedRef = useRef(false);
  const [jwt, setJwt] = useState<string | null>(null);
  const [gameteamId, setgameteamId] = useState<string>('');

  // Admin related states
  const [isAdmin, setIsAdmin] = useState(false);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [showAdminModal, setShowAdminModal] = useState(false);

  const isProcessingInputRef = useRef(false);
  const isConnectingRef = useRef(false);

  // Track component mount status
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Close WebSocket on unmount
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (xtermRef.current) {
        xtermRef.current.dispose();
      }
    };
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async currentUser => {
      if (currentUser) {
        try {
          const teamsRef = collection(db, 'teams');
          const teamsSnap = await getDocs(teamsRef);

          const userId = currentUser.uid;

          await checkIfUserIsAdmin(userId);

          for (const teamDoc of teamsSnap.docs) {
            const teamData = teamDoc.data();

            if (
              Array.isArray(teamData.memberIds) &&
              teamData.memberIds.includes(userId)
            ) {
              console.log(`User found in team: ${teamData.name}`);
              setgameteamId(teamDoc.id);
              return;
            }
          }

          console.warn('User not found in any team');
          setgameteamId('');
        } catch (error) {
          console.error('Error fetching teams:', error);
          setgameteamId('');
        }
      } else {
        setgameteamId('');
      }
      if (currentUser) {
        try {
          const token = await currentUser.getIdToken(true);
          setJwt(token);
          localStorage.setItem('token', token);
        } catch (error) {
          console.error('Failed to get JWT:', error);
          setJwt(null);
        }
      } else {
        console.error('No user is signed in.');
        setJwt(null);
      }
    });

    // Cleanup the auth listener when the component unmounts
    return () => unsubscribe();
  }, []);

  // Check if the user is the session admin
  const checkIfUserIsAdmin = async (userUid: string) => {
    const sessionId = localStorage.getItem('sessionId');

    const sessionRef = doc(db, 'sessions', sessionId || '');
    const sessionSnap = await getDoc(sessionRef);
    const sessionData = sessionSnap.data();

    if (sessionData && sessionData.adminId === userUid) {
      setIsAdmin(true);

      const teamIds = localStorage.getItem('teamIds')?.split(',');
      if (teamIds) {
        setTeamIds(teamIds);
      }

      setShowAdminModal(true);
      return;
    }
    setIsAdmin(false);
  };

  // Get username and team ids
  const fetchUsernameById = async (userUid: string) => {
    const userRef = doc(db, 'login', userUid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      return userData.userName;
    } else {
      console.warn('No such user!');
      return null;
    }
  };

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (isMountedRef.current) {
        setCurrentUser(user);
      }
    });

    return () => unsubscribe();
  }, []);

  // Initialize terminal and WebSocket connection
  useEffect(() => {
    // Only proceed if the ref is available and component is mounted
    if (!terminalRef.current || !isMountedRef.current || xtermRef.current)
      return;

    let isCancelled = false;

    // Use a function to handle the async import and initialization
    const initializeTerminal = async () => {
      try {
        // Dynamically import the browser-only libraries inside the hook
        const {Terminal} = await import('xterm');
        const {FitAddon} = await import('xterm-addon-fit');

        if (isCancelled) return;

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
          // Clear any existing content in the terminal container
          terminalRef.current.innerHTML = '';
          term.open(terminalRef.current);
        }

        term.onData(data => {
          if (data === '\x04') {
            // Ctrl + D
            term.writeln('\r\n\x1b[31mSession aborted by user.\x1b[0m\r\n');

            // Close any active WebSocket
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
              wsRef.current.close();
            }

            // Reset UI state
            setIsConnected(false);
            isConnectingRef.current = false;
          }
        });

        xtermRef.current = term;

        if (isMountedRef.current) {
          setIsTerminalInitialized(true);
        }
      } catch (error) {
        console.error('Terminal initialization error:', error);
      }
    };

    initializeTerminal();

    return () => {
      isCancelled = true;
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      if (xtermRef.current) {
        try {
          xtermRef.current.dispose();
        } catch (e) {
          console.log('Terminal disposal error:', e);
        }
        xtermRef.current = null;
      }
      fitAddonRef.current = null;
      setIsTerminalInitialized(false);
      setIsConnected(false);
    };
  }, []); // Empty dependency array ensures this runs only once

  // Call this to wait for JWT
  useEffect(() => {
    const initWebSocketConnection = async (term: Terminal) => {
      try {
        const userId = currentUser?.uid || 'GUEST';
        const userName = await fetchUsernameById(userId);

        await checkIfUserIsAdmin(userId);

        term.writeln(`Connecting to terminal...\r\n`);
        term.writeln(`Welcome ${userName} to the CyberBattles shell.\r\n`);

        if (isAdmin && !gameteamId) {
          term.writeln(
            `\x1b[33mAdmin mode: Please select a team to connect to.\x1b[0m\r\n`,
          );
          return;
        }

        if (gameteamId === '' && !isAdmin) {
          term.write(
            `\x1b[33mYou are not a member of a team. Join a team to begin. Abort with CTRL^D\r\n\x1b[0m`,
          );
          return;
        }

        term.write(
          `\x1b[33mWaiting for game start, leave queue with CTRL^D.\r\n\x1b[0m`,
        );

        openWebSocket(term, gameteamId, userId, jwt!);
      } catch (err) {
        console.error('Connection error:', err);
      }
    };

    if (jwt && xtermRef.current && !isProcessingInputRef.current) {
      initWebSocketConnection(xtermRef.current);
    }
  }, [jwt, isTerminalInitialized, currentUser, gameteamId]);

  const openWebSocket = (
    term: Terminal,
    teamId: string,
    userId: string,
    jwt: string,
  ) => {
    // Clear any previous connection or event handlers
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }

    const host = 'cyberbattl.es';
    let ws: WebSocket | null = null;
    let abort = false;

    // Track event disposables so they can be cleaned up on reconnect
    let inputHandler: any = null;
    const ctrlDHandler: any = null;

    // Track if we've shown the initial retry message
    let hasShownRetryMessage = false;

    const connect = () => {
      if (abort || !isMountedRef.current || isConnectingRef.current) return;
      isConnectingRef.current = true;

      ws = new WebSocket(`wss://${host}/terminals/${teamId}/${userId}/${jwt}`);
      wsRef.current = ws;

      const connectionTimeout = setTimeout(() => {
        if (ws?.readyState === WebSocket.CONNECTING) {
          ws.close();
        }
      }, 5000);

      ws.onopen = () => {
        if (xtermRef.current) {
          try {
            xtermRef.current.reset();
            xtermRef.current.clear();
          } catch {}
        }

        clearTimeout(connectionTimeout);
        isConnectingRef.current = false;
        setIsConnected(true);

        // Dispose any previous listeners before adding new ones
        if (inputHandler) inputHandler.dispose();
        if (ctrlDHandler) ctrlDHandler.dispose();

        // Forward terminal input to WebSocket
        inputHandler = term.onData(data => {
          if (!abort && ws?.readyState === WebSocket.OPEN) {
            ws.send(data);
          }
        });
      };
      ws.onmessage = async event => {
        if (event.data instanceof Blob) {
          const arrayBuffer = await event.data.arrayBuffer();
          const data = new Uint8Array(arrayBuffer);
          term.write(data);
        } else {
          term.write(event.data);
        }
      };

      ws.onerror = () => {
        clearTimeout(connectionTimeout);
        isConnectingRef.current = false;
        ws?.close();
      };

      ws.onclose = () => {
        clearTimeout(connectionTimeout);
        isConnectingRef.current = false;
        setIsConnected(false);

        if (!abort && isMountedRef.current) {
          // Show retry message (first time) or update count (subsequent times)
          if (!hasShownRetryMessage) {
            hasShownRetryMessage = true;
          }

          setTimeout(connect, 5000);
        }
      };
    };

    connect();

    // Cleanup when closing or unmounting
    return () => {
      abort = true;
      if (ws) ws.close();
      if (inputHandler) inputHandler.dispose();
      if (ctrlDHandler) ctrlDHandler.dispose();
      isConnectingRef.current = false;
    };
  };

  // Handle resize
  useEffect(() => {
    if (!isTerminalInitialized || !fitAddonRef.current) return;

    const handleResize = () => {
      if (fitAddonRef.current && isMountedRef.current) {
        try {
          fitAddonRef.current.fit();
        } catch (e) {
          console.log('Resize error:', e);
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
    <div
      style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#1a1a1a',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div
        style={{
          padding: '65px',
          color: 'white',
          backgroundColor: '#2c3e50',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
        }}
      >
        <div
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            backgroundColor: isConnected ? '#2ecc71' : '#e74c3c',
          }}
        ></div>
        <span>
          Web Terminal {isConnected ? '- Connected' : '- Connecting...'}
        </span>
        {currentUser && (
          <span style={{marginLeft: 'auto', fontSize: '14px'}}>
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
          minHeight: 0,
        }}
      />

      <div>
        <FlagPopup />
      </div>

      {showAdminModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              backgroundColor: '#2c3e50',
              padding: '20px 40px',
              borderRadius: '8px',
              color: 'white',
              textAlign: 'center',
            }}
          >
            <h3 style={{marginTop: 0}}>Select a Team Terminal</h3>
            <p>
              As an admin, please choose which team's terminal you want to
              access.
            </p>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                marginTop: '20px',
              }}
            >
              {teamIds.map(id => (
                <button
                  key={id}
                  onClick={() => {
                    setgameteamId(id);
                    setShowAdminModal(false);
                  }}
                  style={{
                    padding: '10px 20px',
                    cursor: 'pointer',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: '#3498db',
                    color: 'white',
                    fontSize: '16px',
                  }}
                >
                  Connect to Team: {id}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
