import {Router, Request, Response} from 'express';
import * as fs from 'fs/promises';
import * as path from 'path';

import {db} from '../services/firebase';
import {createSession, startSession} from '../services/sessions';
import {getWgAddress} from '../helpers';
import {CreateSessionResult, StartSessionResult, Team, User} from '../types';
import {verifyToken} from '../helpers';

const router = Router();

// Listen for requetss to create a new session
router.post('/session', async (req: Request, res: Response) => {
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

    return res.status(201).json({result: result});
  } catch (error) {
    const errorMessage = `Error creating session: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMessage);
    return res.status(500).json({result: errorMessage});
  }
});

// Listen for requests to start a session
router.post('/start-session', async (req: Request, res: Response) => {
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

// Return the WireGuard config for a user in a session
router.get(
  '/config/:sessionId/:teamId/:userId/:token',
  async (req: Request, res: Response) => {
    try {
      // Get the sessionId, teamId, userId, and token from the request params
      const {sessionId, teamId, userId, token} = req.params;

      // Verify the token
      try {
        const tokenUid = await verifyToken(token);
        if (!userId || userId.length === 0) {
          throw new Error('Invalid token');
        }
        if (tokenUid !== userId) {
          throw new Error('Token UID does not match user ID');
        }
      } catch (error) {
        console.error('Token verification failed:', error);
        return res.status(401).send();
      }

      // Validate parameters
      if (
        typeof sessionId !== 'string' ||
        typeof teamId !== 'string' ||
        typeof userId !== 'string'
      ) {
        return res.status(400).send('Invalid parameters');
      }

      // Look up the team and user based on the URL parameters
      const userNameRef = db.collection('login').doc(userId);
      const userDoc = await userNameRef.get();
      const user = userDoc.data() as User | undefined;
      const teamRef = db.collection('teams').doc(teamId);
      const teamDoc = await teamRef.get();
      const team = teamDoc.data() as Team | undefined;
      if (!user || !team) {
        return res.status(404).send('User or team not found');
      }

      // Confirm the user is in the given team
      if (!team.memberIds.includes(user.UID)) {
        return res.status(403).send('User is not in the given team');
      }

      // Work out which config to give the user
      const configNumber = team.memberIds.indexOf(user.UID) + 1;

      // Read the config file and qr code
      const configPath = path.join(
        __dirname,
        `../../../wg-configs/${sessionId}/${configNumber}-member-${teamId}/wg1.conf`,
      );
      const imagePath = path.join(
        __dirname,
        `../../../wg-configs/${sessionId}/${configNumber}-member-${teamId}/wg1.png`,
      );

      // Get the IP address of the user's team's container
      const containerIp = await getWgAddress(team.sessionId, team.id);

      try {
        // Read and enocde the files
        const configFileText = await fs.readFile(configPath, 'utf8');
        const imageBuffer = await fs.readFile(imagePath);
        const qrCodeBase64 = imageBuffer.toString('base64');

        // Send the config file and qr code back to the sender
        return res.status(200).json({
          config: configFileText,
          qrCode: qrCodeBase64,
          username: user.userName,
          ipAddress: containerIp,
        });
      } catch (fileError) {
        console.error('Error reading config or image file:', fileError);
        return res.status(500).send('Error reading config or image file');
      }
    } catch (error) {
      const errorMessage = `Error retrieving config: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(errorMessage);
      return res.status(500).send(errorMessage);
    }
  },
);

// Return a team's pcap file for their container
router.get('/captures/:teamId/:token', async (req: Request, res: Response) => {
  try {
    // Get the teamId and token from the request params
    const {teamId, token} = req.params;

    // Verify the token
    let userUid: string;
    try {
      const tokenUid = await verifyToken(token);
      if (tokenUid === '') {
        throw new Error('Invalid token');
      }
      userUid = tokenUid;
    } catch (error) {
      console.error('Token verification failed:', error);
      return res.status(401).send();
    }

    // Validate the teamId
    if (typeof teamId !== 'string') {
      return res.status(400).send('Invalid parameters');
    }

    // Look up the team based on the URL parameters
    const teamRef = db.collection('teams').doc(teamId);
    const teamDoc = await teamRef.get();
    const team = teamDoc.data() as Team | undefined;
    if (!team) {
      return res.status(404).send('Team not found');
    }

    // Verify the user is in the team
    if (!team.memberIds.includes(userUid)) {
      return res.status(403).send('User is not in the given team');
    }

    try {
      // Check if the pcap file exists
      const pcapPath = path.join(
        __dirname,
        `../../../captures/${team.sessionId}/${teamId}.pcap`,
      );
      if (!fs.access(pcapPath)) {
        return res.status(404).send('Capture file not found.');
      }

      // Send the pcap file back to the sender, letting Express handle the hard parts
      return res.sendFile(pcapPath, err => {
        if (err) {
          console.error('Error sending file:', err);
        }
      });
    } catch (fileError) {
      console.error('Error reading pcap file:', fileError);
      return res.status(500).send('Error reading pcap file');
    }
  } catch (error) {
    const errorMessage = `Error retrieving pcap: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(errorMessage);
    return res.status(500).send(errorMessage);
  }
});

export default router;
