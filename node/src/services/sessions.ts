import {machineIdSync} from 'node-machine-id';
import * as path from 'path';
import * as fs from 'fs/promises';
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
} from './docker';
import {generateId} from '../helpers';

let nextAvailableWGPort = 51820;
const serverId = machineIdSync();

/**
 * Creates a new team with the specified name, number of members, and scenario.
 * @param name The name of the team.
 * @param numMembers The number of members in the team.
 * @param selectedScenario The index of the scenario to use.
 * @param sessionId The unique ID of the session.
 * @param networkName The name of the Docker network to connect the container to.
 * @param teamIndex The index of the team used for WireGuard config selection.
 * @returns A Promise that resolves to a Team object containing the created team and its members.
 */
export async function createTeam(
  name: string,
  numMembers: number,
  selectedScenario: number,
  sessionId: string,
  networkName: string,
  teamId: string,
): Promise<Team> {
  const scenarios: string[] = await getScenarios();

  // Check if the scenario is valid
  const dockerImage = scenarios.at(selectedScenario);
  if (dockerImage === undefined) {
    throw new Error(
      'Invalid scenario selected. Please choose a valid scenario.',
    );
  }

  // Create a container for the team
  const containerId = await createTeamContainer(
    dockerImage,
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
 * @param senderUid The UID of the user creating the session.
 * @returns A Promise that resolves to an object containing the session and team IDs.
 */
export async function createSession(
  selectedScenario: number,
  numTeams: number,
  numMembersPerTeam: number,
  senderUid: string,
): Promise<CreateSessionResult> {
  console.log(`Starting Scenario ${selectedScenario} Setup`);

  const scenarios: string[] = await getScenarios();

  // Exit if selected scenario is invalid
  if (selectedScenario < 0 || selectedScenario >= scenarios.length) {
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

  // Pre-generate teamIds
  const teamIds: string[] = [];
  for (let i = 0; i < numTeams; i++) {
    teamIds.push(generateId());
  }

  // Create the WireGuard router container
  const wgContainerId = await createWgRouter(
    sessionId,
    networkName,
    wgRouterIp,
    wireguardPort,
    numTeams,
    numMembersPerTeam,
    teamIds,
  );

  console.log(
    `WireGuard Router created with Container ID: ${wgContainerId} at port: ${wireguardPort}`,
  );

  // Create and store teams
  for (let i = 0; i < numTeams; i++) {
    const teamName = `Team-${i + 1}`;
    const team: Team = await createTeam(
      teamName,
      numMembersPerTeam,
      selectedScenario,
      sessionId,
      networkName,
      teamIds[i],
    );

    const teamRef = db.collection('teams').doc(team.id);
    await teamRef.set(team);
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
export async function cleanupAllSessions(): Promise<void> {
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

    // Delete the WireGuard config files
    try {
      const sessionDir = path.resolve(
        __dirname,
        `../../wg-configs/${session.id}`,
      );
      await fs.rm(sessionDir, {recursive: true, force: true});
      console.log(`Deleted WireGuard config files for session ${session.id}.`);
    } catch (error) {
      console.error(
        `Cleanup Error: Failed to delete WireGuard config files for session ${session.id}.`,
      );
    }
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
