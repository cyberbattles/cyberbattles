'use client';

// REF: https://claude.ai/chat/599256c2-bde2-40df-8ad5-3acb29f3ecae
// REF: https://www.qovery.com/blog/react-xtermjs-a-react-library-to-build-terminals/
// REF: https://www.npmjs.com/package/xterm-for-react
// REF: https://www.tkcnn.com/github/xtermjs/xterm.js.html
// REF: https://chatgpt.com/c/68b93e97-0f38-832f-a207-b02b0dc4eef6
// REF: https://chatgpt.com/share/68d9cb25-aecc-8008-91cb-1ce122b78793

import {db} from '@/lib/firebase';
import {User} from 'firebase/auth';
import React, {useEffect, useRef, useState} from 'react';
import {Terminal, IDisposable} from 'xterm';
import {FitAddon} from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import FlagPopup from '@/components/FlagPopup';
import {collection, doc, getDoc, getDocs} from 'firebase/firestore';
import {useAuth} from '@/components/Auth';

export default function Shell() {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isTerminalInitialized, setIsTerminalInitialized] = useState(false);
  const isMountedRef = useRef(false);
  const [, setJwt] = useState<string | null>(null);
  const [gameteamId, setgameteamId] = useState<string>('');
  const {currentUser} = useAuth();

  // Admin related states
  const [isAdmin, setIsAdmin] = useState(false);
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [teamSelectionListener, setTeamSelectionListener] =
    useState<IDisposable | null>(null);

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
    const checkAdminStatus = async () => {
      if (currentUser) {
        try {
          await checkIfUserIsAdmin(currentUser.uid);
        } catch (_) {
          setIsAdmin(false);
        }
      } else {
        setIsAdmin(false);
      }
    };
    checkAdminStatus();
  }, [currentUser?.uid]);

  useEffect(() => {
    const checkUser = async () => {
      if (currentUser && isMountedRef.current) {
        try {
          const token = await currentUser.getIdToken();
          setJwt(token);
          localStorage.setItem('token', token);

          const teamsRef = collection(db, 'teams');
          const teamsSnap = await getDocs(teamsRef);
          let userTeamId = '';
          for (const teamDoc of teamsSnap.docs) {
            const teamData = teamDoc.data();
            if (
              Array.isArray(teamData.memberIds) &&
              teamData.memberIds.includes(currentUser.uid)
            ) {
              userTeamId = teamDoc.id;
              break;
            }
          }
          setgameteamId(userTeamId);
          if (!userTeamId) {
            console.warn('User not found in any team');
          }
        } catch (error) {
          console.error('Error during auth state processing:', error);
          // Clear all related state on error
          setJwt(null);
          setIsAdmin(false);
          setgameteamId('');
        }
      } else {
        // User is signed out or component is unmounted
        setJwt(null);
        setgameteamId('');
        setIsAdmin(false);
      }
    };

    checkUser();
  }, []);

  // Check if the user is the session admin
  const checkIfUserIsAdmin = async (userUid: string) => {
    const sessionId = localStorage.getItem('sessionId') || '';

    const sessionRef = doc(db, 'sessions', sessionId);
    const sessionSnap = await getDoc(sessionRef);
    const sessionData = sessionSnap.data();

    if (sessionData && sessionData.adminUid === userUid) {
      setIsAdmin(true);

      const teamIds = sessionData.teamIds || [];
      if (teamIds) {
        setTeamIds(teamIds);
      }

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
        fitAddon.fit();

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
    const term = xtermRef.current;
    let cleanupWebSocket: () => void = () => {}; // To hold the cleanup function

    const connectAndSetup = async () => {
      if (!currentUser || !term) return;

      try {
        const userId = currentUser.uid;
        const userName = await fetchUsernameById(userId);
        // We no longer get the token here. It will be fetched inside openWebSocket.

        term.writeln(`Connecting to terminal...\r\n`);
        term.writeln(`Welcome ${userName} to the CyberBattles shell.\r\n`);

        // Handle Admin team selection (your existing logic is fine here)
        if (isAdmin && !gameteamId) {
          // Clean up any previous listener
          if (teamSelectionListener) {
            teamSelectionListener.dispose();
          }

          term.writeln(
            '\x1b[33mAdmin Mode: Please select a team to connect to:\x1b[0m',
          );
          teamIds.forEach((id, index) => {
            term.writeln(`  [${index + 1}] ${id}`);
          });
          term.write('\r\nEnter selection number: ');

          // Create a new, temporary listener
          const listener = term.onData(data => {
            // Echo the typed character
            term.write(data);
            if (data === '\r') {
              // Enter key
              const input = term.buffer.active
                .getLine(term.buffer.active.cursorY)
                ?.translateToString()
                .trim();
              const selectionStr = input?.split(': ').pop() || '';
              const selection = parseInt(selectionStr, 10);

              if (
                !isNaN(selection) &&
                selection > 0 &&
                selection <= teamIds.length
              ) {
                const selectedTeamId = teamIds[selection - 1];
                term.writeln(
                  `\r\nSelected Team: ${selectedTeamId}. Connecting...`,
                );
                setgameteamId(selectedTeamId);

                listener.dispose();
                setTeamSelectionListener(null);
              } else {
                term.writeln(
                  '\r\n\x1b[31mInvalid selection. Please try again.\x1b[0m',
                );
                term.write('Enter selection number: ');
              }
            }
          });
          setTeamSelectionListener(listener);
          return; // Don't connect until admin selects a team
        }

        if (gameteamId === '' && !isAdmin) {
          term.write(
            `\x1b[33mYou are not a member of a team. Join a team to begin. Abort with CTRL^D\r\n\x1b[0m`,
          );
          return;
        }

        if (gameteamId) {
          term.write(
            `\x1b[33mWaiting for game start, leave queue with CTRL^D.\r\n\x1b[0m`,
          );
          // Capture the cleanup function returned by openWebSocket
          //
          cleanupWebSocket = openWebSocket(term, gameteamId, currentUser);
        }
      } catch (err) {
        console.error('Connection error:', err);
        if (term) {
          term.writeln(
            `\x1b[31mFailed to initialize connection: ${err}\x1b[0m`,
          );
        }
      }
    };

    if (
      isTerminalInitialized &&
      currentUser &&
      (gameteamId || isAdmin) &&
      !isConnected &&
      !isConnectingRef.current
    ) {
      connectAndSetup();
    }

    return () => {
      cleanupWebSocket();
    };
  }, [isTerminalInitialized, gameteamId, currentUser?.uid, isAdmin]);

  const openWebSocket = (
    term: Terminal,
    teamId: string,
    user: User, // Changed to accept the full User object
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

    let inputHandler: IDisposable | null = null;
    let hasShownRetryMessage = false;

    let connectedPreviously = false;
    let connectStartTime = 0;

    // Make the connect function async to allow for awaiting the token
    const connect = async () => {
      if (abort || !isMountedRef.current || isConnectingRef.current) {
        return;
      }
      isConnectingRef.current = true;

      try {
        const freshJwt = await user.getIdToken(true);

        if (abort) {
          isConnectingRef.current = false;
          return;
        }

        const wssUrl = `wss://${host}/terminals/${teamId}/${user.uid}/${freshJwt}`;
        ws = new WebSocket(wssUrl);
        wsRef.current = ws;

        const connectionTimeout = setTimeout(() => {
          if (ws?.readyState === WebSocket.CONNECTING) {
            ws.close();
          }
        }, 5000);

        ws.onopen = () => {
          clearTimeout(connectionTimeout);
          isConnectingRef.current = false;
          setIsConnected(true);
          hasShownRetryMessage = false;

          connectedPreviously = true;
          connectStartTime = Date.now();

          if (inputHandler) inputHandler.dispose();

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

          if (inputHandler) {
            inputHandler.dispose();
            inputHandler = null;
          }

          if (!abort && isMountedRef.current) {
            const connectionDuration = connectedPreviously
              ? Date.now() - connectStartTime
              : 0;

            if (
              connectedPreviously &&
              connectionDuration > 2000 &&
              !hasShownRetryMessage
            ) {
              term.writeln(
                '\r\n\x1b[31mConnection lost. Attempting to reconnect...\x1b[0m\r\n',
              );
              hasShownRetryMessage = true;
            }
            setTimeout(connect, 5000);
          }
        };
      } catch (error) {
        console.error('Failed to refresh token for connection:', error);
        term.writeln(
          '\r\n\x1b[31mAuthentication error. Retrying in 5s...\x1b[0m\r\n',
        );
        isConnectingRef.current = false;
        if (!abort && isMountedRef.current) {
          setTimeout(connect, 5000);
        }
      }
    };

    connect();

    return () => {
      abort = true;
      if (ws) ws.close();
      if (inputHandler) inputHandler.dispose();
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
        } catch (e) {}
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
    <div className="h-screen w-full flex flex-col bg-[#1a1a1a] font-sans pt-25 sm:pt-45">
      <div
        ref={terminalRef}
        className="flex-1 min-h-0 overflow-hidden px-5 pb-5"
      />
      <div>
        <FlagPopup />
      </div>
    </div>
  );
}
