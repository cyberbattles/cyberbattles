import * as express from 'express';
import * as http from 'http';
import {WebSocket, WebSocketServer} from 'ws';
import * as Docker from 'dockerode';
import {Duplex, PassThrough} from 'stream';
import * as crypto from 'crypto';
import {generate} from 'random-words';
import * as admin from 'firebase-admin';

const PORT = '1337';
const CREATE_USER_CMD: string[] = ['useradd', '-m', '-s', '/bin/bash'];
const SESSIONS: Session[] = [];
const SCENARIOS: string[] = ['ubuntu:latest'];

const docker = new Docker();

admin.initializeApp({
  credential: admin.credential.applicationDefault(),
});
export const db = admin.firestore();

/**
 * An interface representing a user in the session.
 */
interface User {
  /** The username of the user. */
  username: string;
  /** A unique identifier for the user. */
  id: string;
}

/**
 * An interface representing a team in the session.
 */
interface Team {
  /** The name of the team. */
  name: string;
  /** The number of members in the team. */
  numMembers: number;
  /** The members of the team. */
  members: User[];
  /** The Docker containerId associated with the team. */
  containerId: string;
  /** The ID of the Docker network associated with the team. */
  networkId: string;
  /** The name of the Docker network associated with the team. */
  networkName: string;
  /** A unique identifier for the team. */
  id: string;
}

/**
 * An interface representing a session containing multiple teams.
 */
interface Session {
  /** The teams in the session. */
  teams: Team[];
  /** The number of teams in the session. */
  numTeams: number;
  /** The number of users in the session. */
  numUsers: number;
  /** The index of the selected scenario. */
  selectedScenario: number;
  /** A unique identifier for the session. */
  id: string;
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
 * Creates a new user in the specified Docker container.
 * Usernames are generated randomly using the `random-words` package.
 * @param containerId The ID of the Docker Container in which to create the user.
 * @returns A Promise that resolves to a User object containing the username and ID.
 */
async function createUser(containerId: string): Promise<User> {
  // Generate a random username
  const username = generate({
    min: 1,
    max: 2,
    minLength: 4,
    maxLength: 8,
    join: '-',
  });

  // Generate a unique ID for the user
  const id: string = generateId();

  try {
    const container = docker.getContainer(containerId);

    // Create the user in the container
    const exec = await container.exec({
      Cmd: [...CREATE_USER_CMD, username],
      AttachStdout: true,
      AttachStderr: true,
    });
    await exec.start({});

    // Return a User object literal
    return {username, id};
  } catch (error) {
    throw new Error('Create User Error: Container not found.');
  }
}

/**
 * Creates a Docker network for the team with the specified team ID.
 * Network names are formatted as `teamnet-{teamId}`.
 * @param teamId The unique ID of the team.
 * @returns A Promise that resolves to an object containing the network ID and name.
 */
async function createNetwork(
  teamId: string,
): Promise<{networkId: string; networkName: string}> {
  const networkName = `teamnet-${teamId}`;
  const networkId = await docker.createNetwork({
    Name: networkName,
    Driver: 'bridge',
  });
  return {networkId: networkId.id, networkName: networkName};
}

/**
 * Creates a Docker container for the team with the specified image, name, and team ID.
 * Container names are formatted as `teamcon-{teamName}-{teamId}`.
 * @param image The Docker image to use for the container.
 * @param teamName The name of the team.
 * @param teamId The unique ID of the team.
 * @returns A Promise that resolves to the created Docker ccontacontainerId*/
async function createContainer(
  image: string,
  teamName: string,
  teamId: string,
): Promise<string> {
  const container = await docker.createContainer({
    Image: image,
    Cmd: ['/bin/bash'],
    name: `teamcon-${teamName}-${teamId}`,
    Tty: true,
    HostConfig: {
      NetworkMode: `teamnet-${teamId}`,
    },
  });
  return container.id;
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

  // Create a network for the team
  const {networkId, networkName} = await createNetwork(teamId);

  // Create a container for the team
  const containerId = await createContainer(dockerImage, name, teamId);

  try {
    const container = docker.getContainer(containerId);

    // Start the container
    await container.start();

    // Create a user in the container for each member
    const members: User[] = [];
    for (let i = 0; i < numMembers; i++) {
      const user: User = await createUser(containerId);
      members.push(user);
    }

    // Return a Team object literal
    return {
      name,
      numMembers,
      members,
      containerId,
      networkId,
      networkName,
      id: teamId,
    };
  } catch (error) {
    throw new Error('Create Team Error: Container not found.');
  }
}

/**
 * Starts a new session with the specified scenario, number of teams, and number of members per team.
 * @param selectedScenario The index of the scenario to use.
 * @param numTeams The number of teams to create.
 * @param numMembersPerTeam The number of members in each team.
 * @returns A Promise that resolves to a Session object containing the created teams and their members.
 */
async function startSession(
  selectedScenario: number,
  numTeams: number,
  numMembersPerTeam: number,
): Promise<Session> {
  console.log(`--- Starting Scenario ${selectedScenario} Setup ---`);

  // Exit if selected scenario is invalid
  if (selectedScenario < 0 || selectedScenario >= SCENARIOS.length) {
    throw new Error(
      'Invalid scenario selected. Please choose a valid scenario.',
    );
  }

  // Check if Docker Image is already downloaded if not, pull it
  const image = docker.getImage(SCENARIOS.at(selectedScenario) || '');
  try {
    await image.inspect();
    console.log('Image already exists, skipping pull.');
  } catch (error) {
    console.log(`Pulling image: ${SCENARIOS.at(selectedScenario)}...`);
    await new Promise(resolve =>
      docker.pull(SCENARIOS.at(selectedScenario) || '', {}, (err, stream) => {
        if (stream !== undefined) {
          docker.modem.followProgress(stream, resolve);
        }
      }),
    );
    console.log('Image pulled successfully.');
  }

  // Create and store teams
  const teams: Team[] = [];
  for (let i = 0; i < numTeams; i++) {
    const teamName = `Team-${i + 1}`;
    const team: Team = await createTeam(
      teamName,
      numMembersPerTeam,
      selectedScenario,
    );
    teams.push(team);
  }

  // Generate a unique ID for the session
  const sessionId: string = generateId();

  // Create the Session object literal
  const session: Session = {
    teams,
    numTeams,
    numUsers: numTeams * numMembersPerTeam,
    selectedScenario,
    id: sessionId,
  };

  // Upload session data to Firestore
  const taskRef = db.collection('sessions').doc(session.id);
  await taskRef.set({session: session});
  console.log('Uploaded session data to Firestore:', session.id);

  return session;
}

/**
 * Cleans up the session by stopping and removing all containers and networks in a given session.
 * Removes the session from the global SESSIONS array when complete.
 * @param session The session to clean up.
 * @returns A Promise that resolves when the cleanup is complete.
 */
async function cleanupSession(session: Session): Promise<void> {
  for (const team of session.teams) {
    // Stop and remove the container for each team
    try {
      const container = docker.getContainer(team.containerId);
      await container.stop();
      await container.remove();
    } catch (error) {
      console.error('Cleanup Error: Container not found.');
    }

    // Remove the network for each team
    try {
      await docker.getNetwork(team.networkId).remove();
    } catch (error) {
      console.error('Cleanup Error: Network not found.');
    }
  }
  SESSIONS.splice(SESSIONS.indexOf(session), 1);
}

/**
 * Handles incoming WebSocket connections, creating and managing
 * an interactive terminal session in a Docker container.
 * @param wss The WebSocketServer instance.
 * @returns A Promise that resolves when the WebSocket server is closed.
 */
async function handleWSConnection(wss: WebSocketServer): Promise<void> {
  wss.on('connection', async (ws: WebSocket) => {
    const team = SESSIONS[0]?.teams[0];
    const user = team?.members[0];

    if (team?.containerId && user) {
      console.log(`WebSocket connection established for ${user.username}.`);

      try {
        const container = docker.getContainer(team.containerId);

        // Start a bash shell in the container as the given user
        const exec = await container.exec({
          Cmd: ['/bin/bash'],
          User: user.username,
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

        // Handle input from the user
        ws.on('message', (data: WebSocket) => {
          stream.write(data);
        });

        ws.on('close', () => {
          console.log(`Connection closed for ${user.username}`);
        });
      } catch (error) {
        throw new Error('WebSocket Error: Container not found.');
      }
    } else {
      console.error('Container or user not found for WebSocket connection.');
      ws.close(1011, 'Target container not available.');
    }
  });
}

async function main() {
  // Example: Start session with scenario 0, 2 teams, 2 members each
  const session = await startSession(0, 2, 2);
  SESSIONS.push(session);

  const app = express();
  const server: http.Server = http.createServer(app);
  const wss = new WebSocket.Server({server});

  await handleWSConnection(wss);

  app.use(express.static('public'));

  server.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
  });
}

process.on('SIGINT', async function () {
  console.log('Caught interrupt signal and beginning cleanup...');
  for (const session of SESSIONS) {
    console.log(`Cleaning up session ${session.id}...`);
    await cleanupSession(session);
  }
  process.exit(0);
});

main().catch(err => {
  console.error('Error starting the server:', err);
});
