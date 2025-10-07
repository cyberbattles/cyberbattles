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
import {MdOutlineSignalWifiStatusbarConnectedNoInternet4} from 'react-icons/md';
import {Terminal} from 'xterm';
import {FitAddon} from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import FlagPopup from '@/components/FlagPopup';
import {DocumentData, QueryDocumentSnapshot, collection, doc, getDoc, getDocs} from 'firebase/firestore';

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
  const [showJwt, setShowJwt] = useState(false);
  const [teamId, setteamId] = useState<string | null>(null);

  const isProcessingInputRef = useRef(false);
  const isConnectingRef = useRef(false);

  let dataHandler: any = null;
  let ctrlDHandler: any = null;


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
    const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
      if (user) {
        try {
          const token = await user.getIdToken(true);
          setJwt(token);
          localStorage.setItem("token", token);
          setShowJwt(true);
        } catch (error) {
          console.error("Failed to get JWT:", error);
          setJwt("Could not retrieve token.");
          setShowJwt(true);
        }
      } else {
        console.error("No user is signed in.");
        setJwt(null);
        setShowJwt(false);
      }
    });

    // Cleanup subscription when component unmounts
    return () => unsubscribe();
  }, []);

  // Get username and team ids
  const fetchTeamById = async (teamUid: string) => {
    const teamRef = doc(db, 'teams', teamUid);
    const teamSnap = await getDoc(teamRef);

    if (teamSnap.exists()) {
      const teamData = teamSnap.data();
      return teamData.name;
    } else {
      console.warn('No such team!');
      return null;
    }
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
    if (jwt && xtermRef.current && !isProcessingInputRef.current) {
      initWebSocketConnection(xtermRef.current);
    }
  }, [jwt, isTerminalInitialized]); 
  

  // WebSocket connection function
  const initWebSocketConnection = async (term: Terminal) => {
    try {
      const userId = currentUser?.uid || 'GUEST';

      const userName = await fetchUsernameById(userId);

      term.writeln(`Connecting to terminal...\r\n`);
      term.writeln(
        `Welcome ${userName} to the CyberBattles shell.\r\n`,
      );

      term.writeln(
        `To begin, enter the game ID.\r\n`
      )

      let inputBuffer = "";

    const handleInput = async (data: string) => {
      if (data === "\r") { 
        const enteredTeamId = inputBuffer.trim();
        if (enteredTeamId.length === 0) {
          term.writeln(
            "\r\x1b[31mTeam ID cannot be empty. Try again:\x1b[0m\r\n"
          );
          inputBuffer = "";
          
          return;
        }

        const cleanupInput = () => {
          disposable.dispose();
          inputBuffer = "";
        };        

        const teamsRef = collection(db, "teams");
        const snapshot = await getDocs(collection(db, "teams"));
        term.writeln(`\r\n`);

        term.writeln('Validating Team...\x1b[0m\r\n')

        // Find the first team that matches the name
        const matchedTeamDoc = snapshot.docs.find((doc) => {
          const data = doc.data();
          return data.id === enteredTeamId.toLowerCase();
        });

        if (!matchedTeamDoc) {
          term.writeln(`\x1b[31mTeam '${enteredTeamId}' not found. Try again:\x1b[0m\r\n`);
          inputBuffer = "";
          return;
        }

        const teamData = matchedTeamDoc.data();

        // Validate memberIds
        if (!teamData.memberIds || !Array.isArray(teamData.memberIds)) {
          term.writeln(`\x1b[31mTeam '${enteredTeamId}' has no members configured.\x1b[0m\r\n`);
          inputBuffer = "";
          return;
        }

        if (!teamData.memberIds.includes(userId)) {
          term.writeln(`\x1b[31mYou are not a member of '${enteredTeamId}'. Access denied.\x1b[0m\r\n`);
          inputBuffer = "";
          return;
        }

        // Success
        disposable.dispose();
        cleanupInput(); 
        term.writeln(`Joined team: ${enteredTeamId}\r\n`);
        setteamId(matchedTeamDoc.id);
        openWebSocket(term, matchedTeamDoc.id, userId, jwt!);

      } else if (data === "\u007F") {
        // Backspace
        if (inputBuffer.length > 0) {
          inputBuffer = inputBuffer.slice(0, -1);
          term.write("\b \b");
        }
      } else {
        inputBuffer += data;
        term.write(data);
      }
    };

    const disposable = term.onData(handleInput);

  } catch (err) {
    console.error("Connection error:", err);
  }
};


const openWebSocket = (
  term: Terminal,
  teamId: string,
  userId: string,
  jwt: string
) => {
  // Clear any previous connection or event handlers
  if (wsRef.current) {
    try {
      wsRef.current.close();
    } catch {}
    wsRef.current = null;
  }

  if (xtermRef.current) {
    try {
      xtermRef.current.reset();
      xtermRef.current.clear();
    } catch {}
  }

  const host = "cyberbattl.es";
  let retryCount = 0;
  let ws: WebSocket | null = null;
  let abort = false;
  let closedByUser = false;

  // Track event disposables so they can be cleaned up on reconnect
  let inputHandler: any = null;
  let ctrlDHandler: any = null;

  // Track if we've shown the initial retry message
  let hasShownRetryMessage = false;

  term.write(`\x1b[33mWaiting for game start, leave queue with CTRL^D.\r\n\x1b[0m`);

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
      clearTimeout(connectionTimeout);
      isConnectingRef.current = false;
      setIsConnected(true);
      retryCount = 0;

      // Dispose any previous listeners before adding new ones
      if (inputHandler) inputHandler.dispose();
      if (ctrlDHandler) ctrlDHandler.dispose();

      // Forward terminal input to WebSocket
      inputHandler = term.onData((data) => {
        if (!abort && ws?.readyState === WebSocket.OPEN) {
          ws.send(data);
        }
      });

      // Ctrl+C handler to abort connection
      ctrlDHandler = term.onData((data) => {
        if (data === "\x04") { // Ctrl+D
          abort = true;
          ws?.close();
          if (!closedByUser) {
            closedByUser = true;
            term.writeln("\r\n\x1b[31mConnection aborted by user.\x1b[0m\r\n");
          }
        }
      });
    };
    ws.onmessage = async (event) => {
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
        retryCount++;

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
    </div>
  );
}
function setJwt(token: string) {
  throw new Error('Function not implemented.');
}

function setShowJwt(arg0: boolean) {
  throw new Error('Function not implemented.');
}

