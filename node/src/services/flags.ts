import {db} from './firebase';
import {Team, FlagResponse} from '../types';
import {isSessionActive} from './sessions';
import {FieldValue} from 'firebase-admin/firestore';
import * as axios from 'axios';

/**
 * Generates a random flag string with an optional prefix and base64 encoding.
 * Flag is always 8 chars long.
 * @param {string} prefix - A string to prepend to flag. genFlag will wrap it in curly braces, e.g., "prefix{random_part}".
 * @param {boolean} base64 - If true, the final flag string will be base64 encoded.
 * @returns {string} The generated flag string.
 */
export function genFlag(prefix: string, base64: boolean): string {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let flag = '';

  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    flag += characters.charAt(randomIndex);
  }

  if (prefix.length > 0) {
    flag = prefix + '{' + flag + '}';
  }

  if (base64) {
    flag = Buffer.from(flag).toString('base64');
  }
  return flag;
}

/** Sends a flag to a specified API endpoint using an HTTP POST request.
 * @param {string} endPoint - The URL of the API endpoint to send flag.
 * @param {string} flag - The flag to send.
 * @param {string} ip - The IP address to include in the request payload.
 * @param {string} port - The port number to include in the request payload.
 * @returns {Promise<any>} A promise that resolves with the data from the API response.
 * @throws {Error} Throws an error if the HTTP request fails.
 */
async function sendFlag(
  endPoint: string,
  flag: string,
  ip: string,
  port: string,
): Promise<boolean> {
  try {
    const response = await axios.post<FlagResponse>(endPoint, {
      ip: ip,
      port: port,
      flag: flag,
    });

    if (response.status === 200 && response.data.status === 'success') {
      return true;
    } else if (response.status === 200 && response.data.status === 'failure') {
      return false;
    } else {
      return false;
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Emulates a typical sleep function.
 * @param {number} ms - The number of milliseconds to wait.
 * @returns {Promise<void>} A promise that resolves after the specified delay.
 */
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Updates team's flag array in Firebase, keeping only the 3 newest flags.
 * @param {string} teamId - The ID of the team document in Firestore.
 * @param {string} flag - The new flag string to set.
 * @returns {Promise<void>} A promise that resolves once the database update is complete.
 */
async function updateFlag(teamId: string, flag: string): Promise<void> {
  const teamRef = db.doc(`teams/${teamId}`);

  await db.runTransaction(async transaction => {
    const doc = await transaction.get(teamRef);
    if (!doc.exists) {
      throw 'Document does not exist!';
    }

    const activeFlags = doc.data()?.activeFlags || [];

    activeFlags.push(flag);
    const updatedFlags = activeFlags.slice(-3); // Keeps the 3 newest flags

    transaction.update(teamRef, {activeFlags: updatedFlags});
  });
}

/**
 * Increments the `downCount` in firebase to indicate a failed flag injection.
 * @param {string} teamId - The ID of the team.
 * @returns {Promise<void>} A promise that resolves once the database update is complete.
 */
async function updateDown(teamId: string): Promise<void> {
  const teamRef = db.doc(`teams/${teamId}`);

  await teamRef.update({
    downCount: FieldValue.increment(1),
  });
}

/**
 * The main execution loop. This function runs indefinitely, performing the following steps:
 * 1. Iterates through a list of endpoints.
 * 2. For each endpoint, generates a new flag.
 * 3. Attempts to inject the flag at the endpoint.
 * 4. If successful, it updates the valid flags in Firestore.
 * 5. If it fails, it increments the team's downCount in Firestore.
 * 6. Waits for a random delay between 2 to 3 minutes before repeating the process.
 * @param {Array<Team>} teams - An array of Team interfaces.
 * @returns {Promise<void>} This function runs in an infinite loop and does not resolve.
 */
export async function flagService(
  teams: Array<Team>,
  scoringBotIp: string | null,
): Promise<void> {
  // Early exit conditions
  if (teams.length === 0) {
    return;
  }
  if (!scoringBotIp) {
    return;
  }

  const indexes = new Map<string, number>();
  const endPoint = `http://${scoringBotIp}:8080/inject`;

  console.log('Flag service started');
  while (await isSessionActive(teams[0].sessionId)) {
    for (const team of teams) {
      let flag = genFlag('cybrbtls', false);
      console.log(`Send team: ${team.id}, flag: ${flag}`);

      try {
        if (!team.ipAddress) {
          throw new Error('No IP address');
        }
        const port = '5000';
        if (!(await sendFlag(endPoint, flag, team.ipAddress, port))) {
          throw new Error('Flag injection failed');
        }

        console.log(`Flag injection succesful for: ${team.id}, flag: ${flag}`);
        sendFlag(endPoint, flag, team.ipAddress, port);

        const currentIndex = indexes.get(team.id) || 0;
        updateFlag(team.id, flag);
        indexes.set(team.id, currentIndex + 1);
      } catch (error) {
        console.error(
          `Flag injection FAILED for: ${team.id}, flag: ${flag}. Error: ${error}`,
        );

        updateDown(team.id);
      }
    }
    const delay = Math.floor(Math.random() * (180000 - 120000)) + 120000;
    await sleep(delay);
  }
  console.log('Flag service ended');
}
