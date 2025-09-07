import {Router, Request, Response} from 'express';
import {createSession, startSession} from '../services/sessions';
import {CreateSessionResult, StartSessionResult} from '../types';
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

export default router;
