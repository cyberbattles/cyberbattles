import * as admin from 'firebase-admin';

/**
 * An interface representing a user in the session.
 */
export interface User {
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
export interface Team {
  /** The name of the team. */
  name: string;
  /** The number of members in the team. */
  numMembers: number;
  /** The user ids of each member of the team. */
  memberIds: string[];
  /** The UID of the team leader. */
  teamLeaderUid: string;
  /** The Docker containerId associated with the team. */
  containerId: string;
  /** A unique identifier for the team. */
  id: string;
  /** The session ID of the session this team belongs to. */
  sessionId: string;
  /** The IP address assigned to the team's container, on the WireGuard network. */
  ipAddress: string | null;
}

/**
 * An interface representing a session containing multiple teams.
 */
export interface Session {
  /** The teams in the session. */
  teamIds: string[];
  /** The number of teams in the session. */
  numTeams: number;
  /** The number of users in the session. */
  numUsers: number;
  /** The index of the selected scenario. */
  scenarioId: string;
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
  /** The external port of the WireGuard router for this session. */
  wgPort: number;
  /** The allocaed virtual subnet for this session. */
  subnet: string;
  /** The ID of the scoring container for this session. */
  scoringContainerId: string;
  /** A unique identifier for the session. */
  id: string;
  /** The timestamp when the session was created. */
  createdAt: admin.firestore.Timestamp;
}

/**
 * An interface representing a result of creating a session.
 */
export interface CreateSessionResult {
  /** The ID of the newly created session */
  sessionId: string;
  /** The IDs of the newly created teams */
  teamIds: string[];
}

/**
 * An interface representing a result of starting a session.
 */
export interface StartSessionResult {
  /** True if the session was started successfully, false otherwise. */
  success: boolean;
  /** A message containing additional information about the start. */
  message: string;
  /** A dictionary of teams and their members if the start was successful. */
  teamsAndMembers?: {[key: string]: string[]};
}

/**
 * An interface representing the health of the Docker server.
 */
export interface DockerHealth {
  status: 'healthy' | 'unhealthy';
  containers: number;
  containersRunning: number;
  containersPaused: number;
  containersStopped: number;
  images: number;
  serverVersion: string;
  memTotal: number;
  cpuCores: number;
}
