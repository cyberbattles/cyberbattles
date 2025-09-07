import * as http from 'http';
import {Duplex, PassThrough} from 'stream';
import {WebSocket, WebSocketServer} from 'ws';
import {docker} from './docker';
import {db} from './firebase';
import {Session, Team} from '../types';
import {verifyToken} from '../helpers';

/**
 * Handles incoming WebSocket connections, creating and managing
 * an interactive terminal session in a Docker container.
 * Extracts team name, user name, and token from the URL then
 * retrieves the corresponding team and user info from Firestore.
 * @param wss The WebSocketServer instance.
 * @returns A Promise that resolves when the WebSocket server is closed.
 */
export async function handleWSConnection(wss: WebSocketServer): Promise<void> {
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

      // Handle WebSocket closure
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
