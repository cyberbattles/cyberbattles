import {machineIdSync} from 'node-machine-id';
import * as path from 'path';
import * as fs from 'fs/promises';
import * as admin from 'firebase-admin';
import {
  CreateSessionResult,
  Session,
  StartSessionResult,
  Team,
  User,
} from '../types';
import {db} from './firebase';
import {
  getScenarios,
  createNetwork,
  createTeamContainer,
  createWgRouter,
  createUser,
  docker,
  getContainerIpAddress,
} from './docker';
import {
  generateId,
  getAvailableWGPort,
  getAvailableSubnet,
  releaseWGPort,
  releaseSubnet,
  getWgAddress,
} from '../helpers';
import {startTrafficCap} from './trafficcap';
import {flagService} from './flags';

const CYBERNOTE_ID = '8429abfca004aed7';

// Get a unique ID for this server instance
const serverId = machineIdSync();

/**
 * Creates a new team with the specified name, number of members, and scenario.
 * @param name The name of the team.
 * @param numMembers The number of members in the team.
 * @param scenarioId The ID of the scenario to use for the team.
 * @param sessionId The unique ID of the session.
 * @param networkName The name of the Docker network to connect the container to.
 * @param teamIndex The index of the team used for WireGuard config selection.
 * @returns A Promise that resolves to a Team object containing the created team and its members.
 */
export async function createTeam(
  name: string,
  numMembers: number,
  scenarioId: string,
  sessionId: string,
  networkName: string,
  teamId: string,
): Promise<Team> {
  // Create a container for the team
  const containerId = await createTeamContainer(
    scenarioId,
    name,
    teamId,
    networkName,
    sessionId,
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
      ipAddress: null,
      downCount: 0,
      totalCount: 0,
      totalScore: 0,
      activeFlags: [],
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
 * @param scenarioId The ID of the scenario to use for the session.
 * @param numTeams The number of teams to create.
 * @param numMembersPerTeam The number of members in each team.
 * @param senderUid The UID of the user creating the session.
 * @returns A Promise that resolves to an object containing the session and team IDs.
 */
export async function createSession(
  scenarioId: string,
  numTeams: number,
  numMembersPerTeam: number,
  senderUid: string,
): Promise<CreateSessionResult> {
  console.log(`Starting Scenario ${scenarioId} Setup`);

  const scenarios: string[] = await getScenarios();

  // Exit if selected scenario is invalid
  if (!scenarios.includes(scenarioId)) {
    console.error('Invalid scenario selected:', scenarioId);
    throw new Error(
      'Invalid scenario selected. Please choose a valid scenario.',
    );
  }

  // Generate a unique ID for the session
  const sessionId: string = generateId();

  // Get the next available subnet for the session
  const allocatedSubnet = getAvailableSubnet();
  if (!allocatedSubnet) {
    throw new Error('Virtual network space is full. Please try again later.');
  }

  // Create a network for the session
  const {networkId, networkName, networkSubnet} = await createNetwork(
    sessionId,
    allocatedSubnet,
  );

  if (networkSubnet === 'unknown') {
    throw new Error('Failed to determine network subnet.');
  }

  // Work out values for the WireGuard router
  const ipBase = networkSubnet.split('/')[0].replace(/\.0$/, '');
  const wgRouterIp = `${ipBase}.200`;
  const wireguardPort = getAvailableWGPort();

  if (wireguardPort === null) {
    throw new Error('No available WireGuard ports. Please try again later.');
  }

  // Pre-generate teamIds
  const teamIds: string[] = [];
  for (let i = 0; i < numTeams; i++) {
    teamIds.push(generateId());
  }

  let numTeamsWithScoringBot = numTeams;
  let scoringBotTeamId = 'NOT_IMPLEMENTED';
  let teamIdsWithScorer = teamIds;
  if (scenarioId === CYBERNOTE_ID) {
    // Predefine values for adding the scoring bot as a special team
    numTeamsWithScoringBot = numTeams + 1;
    scoringBotTeamId = sessionId;
    teamIdsWithScorer = teamIds.concat([scoringBotTeamId]);
  }

  // Create the WireGuard router container
  let wgContainerId: string;
  try {
    wgContainerId = await createWgRouter(
      sessionId,
      networkName,
      wgRouterIp,
      wireguardPort,
      numTeamsWithScoringBot,
      numMembersPerTeam,
      teamIdsWithScorer,
    );
  } catch (error) {
    throw new Error(
      `WireGuard Router Creation Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
    );
  }

  console.log(
    `WireGuard Router created with Container ID: ${wgContainerId} at port: ${wireguardPort}`,
  );

  // Create and store teams
  for (let i = 0; i < numTeams; i++) {
    const teamName = `Team-${i + 1}`;
    let team: Team;

    // Create the team
    try {
      team = await createTeam(
        teamName,
        numMembersPerTeam,
        scenarioId,
        sessionId,
        networkName,
        teamIds[i],
      );

      team.ipAddress = await getWgAddress(sessionId, team.id);
    } catch (error) {
      throw new Error(
        `Team Creation Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    // Store the team in Firestore
    const teamRef = db.collection('teams').doc(team.id);
    await teamRef.set(team);
    console.log(`Created team: ${team.name} with ID: ${team.id}`);
  }

  // Create the scoring bot container as a special team
  let scoringBotContainerId = '';
  if (scenarioId === CYBERNOTE_ID) {
    try {
      const scoringBotTeam = await createTeam(
        'scoring-bot',
        1,
        '82202c6ed1bf107e', // Currently hardcoded to the default scenario
        sessionId,
        networkName,
        scoringBotTeamId,
      );
      scoringBotContainerId = scoringBotTeam.containerId;
    } catch (error) {
      throw new Error(
        `Scoring Bot Creation Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }

    console.log(`Created scoring bot for session: ${sessionId}`);
  }

  // Removes session after 4 hours
  setTimeout(
    async () => {
      console.log(`Auto-cleaning up session ${session.id} after 4 hours.`);
      await cleanupSession(session);
    },
    4 * 60 * 60 * 1000,
  );

  // Create a session object
  const session: Session = {
    teamIds,
    numTeams,
    numUsers: numTeams * numMembersPerTeam,
    scenarioId,
    adminUid: senderUid,
    started: false,
    serverId,
    networkId,
    networkName,
    wgContainerId,
    wgPort: wireguardPort,
    subnet: allocatedSubnet,
    scoringContainerId: scoringBotContainerId,
    id: sessionId,
    createdAt: admin.firestore.Timestamp.now(),
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
export async function startSession(
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

  // Define the output path for traffic captures
  const outputPath = path.resolve(__dirname, `../../../captures/${sessionId}`);
  await fs.mkdir(outputPath, {recursive: true});
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

      // Skip the admin user here
      if (userId === sessionData.adminUid) {
        continue;
      } else {
        await createUser(team.containerId, userData.userName);
      }
    }

    // Create a user account for the admin in every container
    const userRef = db.collection('login').doc(sessionData.adminUid);
    const userDoc = await userRef.get();
    const userData = userDoc.data() as User;
    await createUser(team.containerId, userData.userName);

    // Start capturing traffic inside the team container
    try {
      await startTrafficCap(team.id, team.containerId, outputPath);
    } catch (error) {
      console.error(
        `Error starting traffic capture: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  if (sessionData.scoringContainerId === '') {
    // Get the IP Address of the scoring bot container
    const scoringBotIp = await getContainerIpAddress(
      sessionData.scoringContainerId,
    );

    // Start the flag service for the session
    flagService(teams, scoringBotIp);
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
export async function cleanupAllSessions(): Promise<void> {
  console.log('Starting Cleanup of All Sessions');
  const sessionsSnapshot = await db
    .collection('sessions')
    .where('serverId', '==', serverId)
    .get();

  // Clean up any old config & pcap directories that don't have an active session
  await cleanupOldConfigs();

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
 * Deletes the session document from Firestore upon completion.
 * @param session The session object to clean up.
 * @returns A Promise that resolves when the cleanup is complete.
 */
export async function cleanupSession(session: Session): Promise<void> {
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

  // Delete the WireGuard config files
  try {
    const sessionDir = path.resolve(
      __dirname,
      `../../../wg-configs/${session.id}`,
    );
    await fs.rm(sessionDir, {recursive: true, force: true});
    console.log(`Deleted WireGuard config files for session ${session.id}.`);
  } catch (error) {
    console.error(
      `Cleanup Error: Failed to delete WireGuard config files for session ${session.id}.`,
    );
  }

  // Remove the scoring bot container
  try {
    const scoringContainer = docker.getContainer(session.scoringContainerId);
    await scoringContainer.stop();
    await scoringContainer.remove();
  } catch (error) {
    console.error(
      `Cleanup error: Scoring bot container not found or already removed.`,
    );
  }

  // Remove the session network
  try {
    const network = docker.getNetwork(session.networkName);
    await network.remove();
    console.log(
      `Removed network ${session.networkName} for session ${session.id}.`,
    );
  } catch (error) {
    console.error(
      `Cleanup Error: Network not found or already removed for session ${session.id}.`,
    );
  }

  // Release the allocated subnet and WireGuard port
  releaseSubnet(session.subnet);
  releaseWGPort(session.wgPort);

  console.log(`Session document ${session.id} deleted.`);
}

/**
 * Deletes WireGuard configuration and Pcap directories that don't have an active session.
 * Active is any session that exists in Firestore.
 */
async function cleanupOldConfigs(): Promise<void> {
  // Fetch all active session IDs from Firestore
  const activeSessionIds = new Set<string>();
  const sessionsSnapshot = await db.collection('sessions').get();
  sessionsSnapshot.forEach(doc => {
    activeSessionIds.add(doc.id);
  });

  // Read the wg-configs directory
  const wgBaseDir = path.resolve(__dirname, '../../../wg-configs');
  try {
    for (const dirEntry of await fs.readdir(wgBaseDir, {withFileTypes: true})) {
      if (
        dirEntry.isDirectory() &&
        activeSessionIds.has(dirEntry.name) === false
      ) {
        await fs.rm(path.join(wgBaseDir, dirEntry.name), {
          recursive: true,
          force: true,
        });
      }
    }
  } catch (_) {
    // We don't care if this fails
  }

  const pcapBaseDir = path.resolve(__dirname, '../../../captures');
  try {
    for (const dirEntry of await fs.readdir(pcapBaseDir, {
      withFileTypes: true,
    })) {
      if (
        dirEntry.isDirectory() &&
        activeSessionIds.has(dirEntry.name) === false
      ) {
        await fs.rm(path.join(pcapBaseDir, dirEntry.name), {
          recursive: true,
          force: true,
        });
      }
    }
  } catch (_) {
    // We also don't care if this fails
  }
}

export async function isSessionActive(sessionId: string): Promise<boolean> {
  const sessionRef = db.collection('sessions').doc(sessionId);
  const sessionDoc = await sessionRef.get();

  if (sessionDoc.exists) {
    return true;
  }
  return false;
}
