import * as express from 'express';
import {Request, Response} from 'express';
import * as http from 'http';
import {WebSocket, WebSocketServer} from 'ws';
import * as Docker from 'dockerode';
import {Duplex, PassThrough, Writable} from 'stream';
import * as crypto from 'crypto';
import {machineIdSync} from 'node-machine-id';
import * as path from 'path';

import {initializeApp, ServiceAccount, cert} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {getAuth} from 'firebase-admin/auth';
import * as serviceAccount from '../cyberbattles-dd31f-18566f4ef322.json';

const PORT = '1337';
const SCENARIOS: string[] = ['challenge_example'];
const WIREGUARD_IMAGE = 'lscr.io/linuxserver/wireguard:latest';
let nextAvailableWGPort = 51820;
let nextAvilableSubnetOctet = 24;

const docker = new Docker();

initializeApp({
  credential: cert(serviceAccount as ServiceAccount),
});

const db = getFirestore();
const serverId = machineIdSync();

/**
 * An interface representing a user in the session.
 */
interface User {
  /** A unique identifier for the user. */
  UID: string;
  /** The email address of the user. */
  email: string;
  /** The team id of the team this user belongs to. */
  teamId: string;
  /** The userName of the user. */
  userName: string;
}

/**
 * An interface representing a team in the session.
 */
interface Team {
  /** The name of the team. */
  name: string;
  /** The number of members in the team. */
  numMembers: number;
  /** The user ids of each member of the team. */
  memberIds: string[];
  /** The Docker containerId associated with the team. */
  containerId: string;
  /** A unique identifier for the team. */
  id: string;
  /** The session ID of the session this team belongs to. */
  sessionId: string;
}

/**
 * An interface representing a session containing multiple teams.
 */
interface Session {
  /** The teams in the session. */
  teamIds: string[];
  /** The number of teams in the session. */
  numTeams: number;
  /** The number of users in the session. */
  numUsers: number;
  /** The index of the selected scenario. */
  selectedScenario: number;
  /** The UID of the admin who created the session. */
  adminUid: string;
  /** Indicates whether the session has started. */
  started: boolean;
  /** The ID of the server that created the session. */
  serverId: string;
  /** The ID of the Docker network associated with the team. */
  networkId: string;
  /** The name of the Docker network associated with the team. */
  networkName: string;
  /** The container ID of the WireGuard router. */
  wgContainerId: string;
  /** A unique identifier for the session. */
  id: string;
}

/**
 * An interface representing a result of creating a session.
 */
interface CreateSessionResult {
  /** The ID of the newly created session */
  sessionId: string;
  /** The IDs of the newly created teams */
  teamIds: string[];
}

/**
 * An interface representing a result of starting a session.
 */
interface StartSessionResult {
  /** True if the session was started successfully, false otherwise. */
  success: boolean;
  /** A message containing additional information about the start. */
  message: string;
  /** A dictionary of teams and their members if the start was successful. */
  teamsAndMembers?: {[key: string]: string[]};
}

/**
 * Generates a unique ID using crypto.randomBytes.
 *
 * @returns A string representing a unique ID.
 */
function generateId(): string {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Verifies a Firebase ID token and returns the user's UID.
 * @param token The Firebase ID token to verify.
 * @returns A Promise that resolves with the user's UID string.
 */
async function verifyToken(token: string): Promise<string> {
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    return decodedToken.uid;
  } catch (error) {
    const errorMessage = `Token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMessage);
    return '';
  }
}

/**
 * A helper function to run a command in a container and show a loading indicator.
 * @param container The Docker Container in which the command will be run
 * @param command The command to run
 * @returns A Promise that resolves when the command finishes.
 */
async function runCommandInContainer(
  container: Docker.Container,
  command: string[],
): Promise<void> {
  // Run command
  const exec = await container.exec({
    Cmd: command,
    AttachStdout: true,
    AttachStderr: true,
  });

  // Hijack stream
  const stream = await exec.start({});

  // Create a null stream to output to
  const nullStream = new Writable({
    write(chunk, encoding, callback) {
      callback();
    },
  });

  // Redirect our output to the null stream
  // Without this line, code does not run ¯\_(ツ)_/¯
  docker.modem.demuxStream(stream, nullStream, nullStream);

  // Await a promise that resolves when the stream ends (command completes).
  await new Promise<void>((resolve, reject) => {
    // Handle stream errors
    stream.on('error', err => {
      reject(err);
    });

    stream.on('end', () => {
      process.stdout.write('\rCommand completed successfully. \n');
      resolve();
    });

    stream.on('close', () => {
      process.stdout.write('\rCommand completed successfully. \n');
      resolve();
    });
  });

  stream.destroy();
}

/**
 * Creates a new user in the specified Docker container, with the given userName.
 * @param containerId The ID of the Docker Container in which to create the user.
 * @param userName The userName to assign to the new user.
 */
async function createUser(
  containerId: string,
  userName: string,
): Promise<void> {
  try {
    const container = docker.getContainer(containerId);

    // Update apt and install sudo command
    const installSudo = [
      '/bin/sh',
      '-c',
      'apt update && apt install sudo -y  > /dev/null 2>&1',
    ];

    // Create user and add them to sudoers command
    const addSudoUser = [
      '/bin/sh',
      '-c',
      `useradd -m -s /bin/bash ${userName} && usermod -aG sudo ${userName} && echo '${userName} ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers`,
    ];

    // Update repo and install sudo
    await runCommandInContainer(container, installSudo);

    // Create user and add them to sudoers
    await runCommandInContainer(container, addSudoUser);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Create User Error: ${error.message}`);
    }
    throw new Error('Create User Error: An unknown error occurred.');
  }
}

/**
 * Creates a Docker network with the given scenario ID.
 * Network names are formatted as `sessionNet-{sessionId}`.
 * @param sessionId The unique ID of the session.
 * @returns A Promise that resolves to an object containing the network ID, name and subnet.
 */
async function createNetwork(
  sessionId: string,
): Promise<{networkId: string; networkName: string; networkSubnet: string}> {
  // Get the next available subnet
  const subnet = `172.12.${nextAvilableSubnetOctet}.0/24`;

  const IPAM = {
    Driver: 'default',
    Config: [
      {
        Subnet: subnet,
        Gateway: `172.12.${nextAvilableSubnetOctet}.1`,
      },
    ],
  };

  // Increment for next session
  nextAvilableSubnetOctet += 1;

  // Create the network
  const networkName = `sessionNet-${sessionId}`;
  const networkId = await docker.createNetwork({
    Name: networkName,
    Driver: 'bridge',
    IPAM: IPAM,
  });

  // Retrieve the network
  const network = docker.getNetwork(networkId.id);

  // Get the network details to find the allocated subnet
  const networkData = await network.inspect();
  const networkSubnet =
    networkData.IPAM?.Config && networkData.IPAM.Config.length > 0
      ? networkData.IPAM.Config[0].Subnet
      : 'unknown';

  return {
    networkId: networkId.id,
    networkName: networkName,
    networkSubnet: networkSubnet,
  };
}

/**
 * Creates a Docker container for the team with the specified image, name, and team ID.
 * Container names are formatted as `teamcon-{teamName}-{teamId}`.
 * @param image The Docker image to use for the container.
 * @param teamName The name of the team.
 * @param teamId The unique ID of the team.
 * @param networkName The name of the Docker network to connect the container to.
 * @returns A Promise that resolves to the created Docker containerId.
 **/
async function createTeamContainer(
  image: string,
  teamName: string,
  teamId: string,
  networkName: string,
  teamIndex: number,
): Promise<string> {
  const container = await docker.createContainer({
    Image: image,
    name: `teamcon-${teamName}-${teamId}`,
    Tty: true,
    Env: ['PUID=1000', 'PGID=1000'],
    HostConfig: {
      CapAdd: ['NET_ADMIN'],
      Dns: ['1.0.0.1', '1.1.1.1'],
      NetworkMode: networkName,
      CpuQuota: 20_000, // This
      CpuPeriod: 100_000, // And this makes a 20% CPU Usage Limit
      Memory: 4294967296, // 4GB RAM Limit
      MemorySwap: 4294967296 * 2, // 4GB RAM + 4GB Swap Limit
      Sysctls: {
        'net.ipv4.conf.all.src_valid_mark': '1',
      },
      Binds: [
        `${path.resolve(__dirname, `../../wg-configs/peer${teamIndex + 1}/peer${teamIndex + 1}.conf`)}:/etc/wireguard/wg0.conf:ro,z`,
        `${path.resolve(__dirname, '../../challenge-setup-script/supervisord.conf')}:/etc/supervisord.conf:ro,z`,
      ],
      RestartPolicy: {Name: 'unless-stopped'},
    },
  });
  return container.id;
}

async function createWgRouter(
  sessionId: string,
  networkName: string,
  wgRouterIp: string,
  wireguardPort: number,
  numTeams: number,
  numMembersPerTeam: number,
): Promise<string> {
  // Check if the WireGuard image is already pulled
  const image = docker.getImage(WIREGUARD_IMAGE);
  try {
    await image.inspect();
    console.log('WireGuard image already exists, skipping pull.');
  } catch (error) {
    console.log('Pulling WireGuard image');
    await new Promise((resolve, reject) => {
      docker.pull(WIREGUARD_IMAGE, {}, (err: Error, stream) => {
        if (err) {
          return reject(err);
        }
        if (stream) {
          docker.modem.followProgress(stream, (err, output) => {
            if (err) {
              return reject(err);
            }
            resolve(output);
          });
        } else {
          reject(new Error('Docker pull stream is not available.'));
        }
      });
    });
    console.log('WireGuard Image pulled successfully.');
  }

  const container = await docker.createContainer({
    Image: 'lscr.io/linuxserver/wireguard:latest',
    name: `wg-router-${sessionId}`,
    Tty: false,
    Env: [
      'PUID=1000',
      'PGID=1000',
      `PEERS=${numTeams * numMembersPerTeam + numTeams}`,
      'INTERNAL_SUBNET=10.12.0.0/24',
      'ALLOWEDIPS=10.12.0.0/24',
      `SERVERURL=${wgRouterIp}`,
      'PERSISTENTKEEPALIVE_PEERS=all',
      `NUM_TEAMS=${numTeams}`,
      `NUM_PLAYERS=${numMembersPerTeam}`,
      `SERVER_IP=${wgRouterIp}`,
      `SERVER_PORT=${wireguardPort}`,
    ],
    HostConfig: {
      CapAdd: ['NET_ADMIN'],
      Dns: ['1.0.0.1', '1.1.1.1'],
      Binds: [
        `${path.resolve(__dirname, '../../wg-configs')}:/config:z`,
        `${path.resolve(__dirname, '../../server-init-script')}:/custom-cont-init.d:ro,z`,
      ],
      PortBindings: {
        [`${wireguardPort}/udp`]: [{HostPort: `${wireguardPort}`}],
      },
      Sysctls: {
        'net.ipv4.conf.all.src_valid_mark': '1',
        'net.ipv4.ip_forward': '1',
      },
      RestartPolicy: {Name: 'unless-stopped'},
    },
    Healthcheck: {
      Test: ['CMD', 'test', '-f', '/config/init_done'],
      Interval: 6000000000, // 6 seconds in nanoseconds
    },
    NetworkingConfig: {
      EndpointsConfig: {
        [networkName]: {
          IPAMConfig: {IPv4Address: wgRouterIp},
        },
      },
    },
  });
  console.log(`Starting wg-router container for Session: ${sessionId}...`);
  await container.start();
  const wgContainer = docker.getContainer(container.id);

  console.log('Waiting for wg-router to become healthy...');
  let isHealthy = false;
  for (let i = 0; i < 30; i++) {
    // Wait for max 30s
    const inspectData = await wgContainer.inspect();
    if (inspectData.State.Health?.Status === 'healthy') {
      isHealthy = true;
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  if (!isHealthy) {
    throw new Error(
      'WireGuard router container did not become healthy in time.',
    );
  }
  console.log(`WireGuard Router for Session: ${sessionId} is healthy.`);

  return wgContainer.id;
}

/**
 * Creates a new team with the specified name, number of members, and scenario.
 * @param name The name of the team.
 * @param numMembers The number of members in the team.
 * @param selectedScenario The index of the scenario to use.
 * @returns A Promise that resolves to a Team object containing the created team and its members.
 */
async function createTeam(
  name: string,
  numMembers: number,
  selectedScenario: number,
  sessionId: string,
  networkName: string,
  teamIndex: number,
): Promise<Team> {
  // Check if the scenario is valid
  const dockerImage = SCENARIOS.at(selectedScenario);
  if (dockerImage === undefined) {
    throw new Error(
      'Invalid scenario selected. Please choose a valid scenario.',
    );
  }

  // Generate a unique ID for the team
  const teamId: string = generateId();

  // Create a container for the team
  const containerId = await createTeamContainer(
    dockerImage,
    name,
    teamId,
    networkName,
    teamIndex,
  );

  try {
    const container = docker.getContainer(containerId);

    // Start the container
    await container.start();

    // Return a Team object
    return {
      name,
      numMembers,
      memberIds: [],
      containerId,
      id: teamId,
      sessionId,
    };
  } catch (error) {
    throw new Error(
      `Create Team Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }
}

/**
 * Starts a new session with the specified scenario, number of teams, and number of members per team.
 * Once finished, it uploads the session data to Firestore.
 * @param selectedScenario The index of the scenario to use.
 * @param numTeams The number of teams to create.
 * @param numMembersPerTeam The number of members in each team.
 * @returns A Promise that resolves to an object containing the session and team IDs.
 */
async function createSession(
  selectedScenario: number,
  numTeams: number,
  numMembersPerTeam: number,
  senderUid: string,
): Promise<CreateSessionResult> {
  console.log(`Starting Scenario ${selectedScenario} Setup`);

  // Exit if selected scenario is invalid
  if (selectedScenario < 0 || selectedScenario >= SCENARIOS.length) {
    throw new Error(
      'Invalid scenario selected. Please choose a valid scenario.',
    );
  }

  // Generate a unique ID for the session
  const sessionId: string = generateId();

  // Create a network for the team
  const {networkId, networkName, networkSubnet} =
    await createNetwork(sessionId);

  if (networkSubnet === 'unknown') {
    throw new Error('Failed to determine network subnet.');
  }

  // Work out values for the WireGuard router
  const ipBase = networkSubnet.split('/')[0].replace(/\.0$/, '');
  const wgRouterIp = `${ipBase}.200`;
  const wireguardPort = nextAvailableWGPort;

  // Increment for next session
  nextAvailableWGPort += 1;

  // Create the WireGuard router container
  const wgContainerId = await createWgRouter(
    sessionId,
    networkName,
    wgRouterIp,
    wireguardPort,
    numTeams,
    numMembersPerTeam,
  );

  console.log(
    `WireGuard Router created with Container ID: ${wgContainerId} at port: ${wireguardPort}`,
  );

  // Create and store teams
  const teamIds: string[] = [];
  for (let i = 0; i < numTeams; i++) {
    const teamName = `Team-${i + 1}`;
    const team: Team = await createTeam(
      teamName,
      numMembersPerTeam,
      selectedScenario,
      sessionId,
      networkName,
      i,
    );

    const teamRef = db.collection('teams').doc(team.id);
    await teamRef.set(team);
    teamIds.push(team.id);
    console.log(`Created team: ${team.name} with ID: ${team.id}`);
  }

  // Create a session object
  const session: Session = {
    teamIds,
    numTeams,
    numUsers: numTeams * numMembersPerTeam,
    selectedScenario,
    adminUid: senderUid,
    started: false,
    serverId,
    networkId,
    networkName,
    wgContainerId,
    id: sessionId,
  };

  // Upload session data to Firestore
  const taskRef = db.collection('sessions').doc(session.id);
  await taskRef.set(session);
  console.log('Uploaded session data to Firestore:', session.id);

  return {sessionId, teamIds};
}

/**
 * Starts a session by retrieving the session data from Firestore,
 * obtaining the teams, and creating users in the Docker containers.
 * @param sessionId The ID of the session to start.
 * @param senderUid The UID of the user starting the session.
 * @returns A Promise that resolves to a string with a result message when finished.
 **/
async function startSession(
  sessionId: string,
  senderUid: string,
): Promise<StartSessionResult> {
  const sessionRef = db.collection('sessions').doc(sessionId);
  const sessionDoc = await sessionRef.get();
  const sessionData = sessionDoc.data() as Session;

  console.log(`Starting session with ID: ${sessionId}`);
  if (sessionData === undefined) {
    const errorMessage = 'Session not found.';
    console.error(errorMessage);
    return {success: false, message: errorMessage};
  }

  if (sessionData.started) {
    const errorMessage = 'Session is already started.';
    console.error(errorMessage);
    return {success: false, message: errorMessage};
  }

  if (senderUid !== sessionData.adminUid) {
    const errorMessage = 'Only the session admin can start the session.';
    console.error(errorMessage);
    return {success: false, message: errorMessage};
  }

  const teamIds = sessionData?.teamIds || [];
  const teams: Team[] = [];

  if (teamIds.length === 0) {
    const errorMessage = 'No teams found in this session';
    console.error(errorMessage);
    return {success: false, message: errorMessage};
  }

  for (const teamId of teamIds) {
    // Get the team members from Firestore and create users in the container for each
    const teamRef = db.collection('teams').doc(teamId);
    const teamDoc = await teamRef.get();
    const team = teamDoc.data() as Team;
    teams.push(team);

    if (!team) {
      const errorMessage = `Team with ID ${teamId} not found.`;
      console.error(errorMessage);
      return {success: false, message: errorMessage};
    }

    for (const userId of team.memberIds) {
      const userRef = db.collection('login').doc(userId);
      const userDoc = await userRef.get();
      const userData = userDoc.data() as User;

      console.log(`Creating user ${userData.userName} with ID ${userData.UID}`);

      await createUser(team.containerId, userData.userName);
    }
  }

  // Update the session to mark it as started
  sessionData.started = true;
  await sessionRef.set(sessionData);

  const teamsAndMembers: {[key: string]: string[]} = {};
  teams.forEach(team => {
    teamsAndMembers[team.name] = team.memberIds;
  });

  const result = `Session ${sessionId} started successfully.`;
  console.log(result);
  return {success: true, message: result, teamsAndMembers};
}

/**
 * Fetches all sessions from Firestore and removes them from the local machine.
 * Only tries to clean up sessions that were created by this server instance.
 * @returns A Promise that resolves when all sessions have been cleaned up.
 */
async function cleanupAllSessions(): Promise<void> {
  console.log('Starting Cleanup of All Sessions');
  const sessionsSnapshot = await db
    .collection('sessions')
    .where('serverId', '==', serverId)
    .get();

  if (sessionsSnapshot.empty) {
    console.log('No active sessions found to clean up.');
    return;
  }

  for (const sessionDoc of sessionsSnapshot.docs) {
    const data = sessionDoc.data() as Session | undefined;
    if (data) {
      await cleanupSession(sessionDoc.data() as Session);
    }
    await sessionDoc.ref.delete();
  }

  console.log('All Local Sessions Cleaned Up\n');
}

/**
 * Cleans up a single session by stopping and removing its containers and networks.
 * Re
 * Deletes the session document from Firestore upon completion.
 * @param sessionId The ID of the session to clean up.
 * @returns A Promise that resolves when the cleanup is complete.
 */
async function cleanupSession(session: Session): Promise<void> {
  // Exit if the session document is invalid
  if (!session || !session.teamIds || session.teamIds.length === 0) {
    console.warn(`No valid team data for session ${session.id}.`);
    return;
  }

  // Remove the WireGuard router container
  try {
    const wgContainer = docker.getContainer(session.wgContainerId);
    await wgContainer.stop();
    await wgContainer.remove();
  } catch (error) {
    console.error(
      'Cleanup Error: WireGuard router container not found or already removed.',
    );
  }

  for (const teamId of session.teamIds) {
    const teamRef = db.collection('teams').doc(teamId);
    const teamDoc = await teamRef.get();
    const team = teamDoc.data() as Team;

    if (!team) continue;

    // Stop and remove the container
    try {
      const container = docker.getContainer(team.containerId);
      await container.stop();
      await container.remove();
      console.log(`Removed container ${team.containerId} for team ${teamId}.`);
    } catch (error) {
      console.error(
        `Cleanup Error: Container not found or already removed for team ${teamId}.`,
      );
    }

    // Delete the team document
    await teamRef.delete();
  }

  // Remove the session network
  try {
    const network = docker.getNetwork(session.networkName);
    await network.remove();
    console.log(
      `Removed network ${session.networkName} for session ${session.id}.`,
    );
  } catch (error) {
    console.error(error);
    console.error(
      `Cleanup Error: Network not found or already removed for session ${session.id}.`,
    );
  }

  console.log(`Session document ${session.id} deleted.`);
}

/**
 * Handles incoming WebSocket connections, creating and managing
 * an interactive terminal session in a Docker container.
 * Extracts team name, user name, and token from the URL then
 * retrieves the corresponding team and user info from Firestore.
 * @param wss The WebSocketServer instance.
 * @returns A Promise that resolves when the WebSocket server is closed.
 */
async function handleWSConnection(wss: WebSocketServer): Promise<void> {
  wss.on('connection', async (ws: WebSocket, req: http.IncomingMessage) => {
    // Get the team name, user name, and token from the URL
    const urlParts = req.url?.split('/');
    if (!urlParts || urlParts.length !== 5 || urlParts[1] !== 'terminals') {
      console.error('Invalid connection URL:', req.url);
      ws.close(
        1011,
        'Invalid URL format. Use /terminals/{teamId}/{userId}/{token}',
      );
      return;
    }

    // Verify the token
    try {
      const senderUid = await verifyToken(urlParts[4]);
      if (!senderUid || senderUid.length === 0) {
        throw new Error('Invalid token');
      }
    } catch (error) {
      console.error('WebSocket token verification failed:', error);
      ws.close(4001, 'Unauthorized');
      return;
    }

    // Look up the team and user based on the URL parameters
    const userNameRef = db.collection('login').doc(urlParts[3]);
    const userDoc = await userNameRef.get();
    const userName = userDoc.data()?.userName;
    const teamRef = db.collection('teams').doc(urlParts[2]);
    const teamDoc = await teamRef.get();
    const team = teamDoc.data() as Team | undefined;

    // Double check that the session has started
    if (team?.sessionId) {
      const sessionRef = db.collection('sessions').doc(team.sessionId);
      const sessionDoc = await sessionRef.get();
      const session = sessionDoc.data() as Session | undefined;
      if (session && !session.started) {
        console.error(
          `Received attempt to connect to an inactive session: ${team.sessionId}`,
        );
        ws.close(4002, `${team.sessionId} has not yet started.`);
        return;
      }
    }

    // Check that the user is part of the team
    if (team && !team.memberIds.includes(urlParts[3])) {
      console.error(
        `User with ID ${urlParts[3]} is not part of team ${team.id}.`,
      );
      ws.close(4003, 'User is not part of the team.');
      return;
    }

    if (team?.containerId && userName) {
      console.log(`WebSocket connection established for ${userName}.`);

      const container = docker.getContainer(team.containerId);

      // Start a bash shell in the container as the given user
      const exec = await container.exec({
        Cmd: ['/bin/bash'],
        User: userName,
        AttachStdin: true,
        AttachStdout: true,
        AttachStderr: true,
        Tty: true,
      });

      // Hijack the exec command to create a terminal stream
      const stream: Duplex = await exec.start({hijack: true, stdin: true});

      // Handle stdout and stderr streams as well
      const stdout = new PassThrough();
      const stderr = new PassThrough();
      stdout.on('data', (chunk: Buffer) => ws.send(chunk));
      stderr.on('data', (chunk: Buffer) => ws.send(chunk));

      // Let dockerode handle the combining of streams
      docker.modem.demuxStream(stream, stdout, stderr);

      // Handle the different ways the docker stream can end
      stream.once('error', (err: Error) => {
        ws.close(1011, 'Stream error: ' + err.message);
        return;
      });
      stream.once('close', () => {
        ws.close();
        return;
      });

      // Handle input from the user
      ws.on('message', (data: WebSocket) => {
        stream.write(data);
      });

      ws.on('close', () => {
        console.log(`Connection closed for ${userName}`);
        return;
      });
    } else {
      console.error('Container or user not found for WebSocket connection.');
      ws.close(1011, 'Target container not available.');
      return;
    }
  });
}

async function main() {
  const app = express();
  app.use(require('sanitize').middleware);
  const server: http.Server = http.createServer(app);
  const wss = new WebSocket.Server({server});

  // Serve the example xterm.js client
  app.use(express.static('public'));

  // Parse JSON request bodies
  app.use(express.json());

  // Handle WebSocket connections
  await handleWSConnection(wss);

  // Listen for requetss to create a new session
  app.post('/api/session', async (req: Request, res: Response) => {
    try {
      // Extract the data from the request body
      const {selectedScenario, numTeams, numMembersPerTeam, token} = req.body;

      // Verify the token
      let senderUid: string;
      try {
        senderUid = await verifyToken(token);
        if (!senderUid || senderUid.length === 0) {
          throw new Error('Invalid token');
        }
      } catch (error) {
        console.error('Token verification failed:', error);
        return res.status(401).send();
      }

      // Validate incoming data
      if (
        typeof selectedScenario !== 'number' ||
        typeof numTeams !== 'number' ||
        typeof numMembersPerTeam !== 'number'
      ) {
        // If data is missing or invalid, send a 'Bad Request' response
        return res.status(400).json({result: 'Invalid request body'});
      }

      // Create the new session
      const result: CreateSessionResult = await createSession(
        selectedScenario,
        numTeams,
        numMembersPerTeam,
        senderUid,
      );

      console.log(result);

      return res.status(201).json({result: result});
    } catch (error) {
      const errorMessage = `Error creating session: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMessage);
      return res.status(500).json({result: errorMessage});
    }
  });

  // Listen for requests to start a session
  app.post('/api/start-session', async (req: Request, res: Response) => {
    try {
      // Extract the session ID and token from the request body
      const {sessionId, token} = req.body;

      // Verify the token
      let senderUid: string;
      try {
        senderUid = await verifyToken(token);
        if (!senderUid || senderUid.length === 0) {
          throw new Error('Invalid token');
        }
      } catch (error) {
        console.error('Token verification failed:', error);
        return res.status(401).send();
      }

      // Check if sessionId is provided and is a string
      if (typeof sessionId !== 'string') {
        return res.status(400).json({result: 'Invalid session ID'});
      }

      // Start the session
      const result: StartSessionResult = await startSession(
        sessionId.trim(),
        senderUid,
      );

      console.log(result);

      if (!result.success) {
        return res.status(400).json({result: result.message});
      } else {
        return res.status(200).json({
          result: result.message,
          teamsAndMembers: result.teamsAndMembers,
        });
      }
    } catch (error) {
      const errorMessage = `Error starting session: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMessage);
      return res.status(500).json({result: errorMessage});
    }
  });

  server.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
  });
}

process.on('SIGINT', async () => {
  console.log('\nCaught interrupt signal and beginning cleanup...');
  await cleanupAllSessions();
  process.exit(0);
});

main().catch(err => {
  console.error('Error starting the server:', err);
});
