import {db} from './firebase';
import {Team, FlagResponse, Scenario} from '../types';
import {isSessionActive} from './sessions';
import {FieldValue} from 'firebase-admin/firestore';
import * as axios from 'axios';

/**
 * Generates a random flag string with an optional prefix and base64 encoding.
 * Flag is always 16 chars long.
 * @param {string} prefix - A string to prepend to flag. genFlag will wrap it in curly braces, e.g., "prefix{random_part}".
 * @param {boolean} base64 - If true, the final flag string will be base64 encoded.
 * @returns {string} The generated flag string.
 */
export function genFlag(prefix: string, base64: boolean): string {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let flag = '';

  for (let i = 0; i < 16; i++) {
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
 * @returns {Promise<any>} A promise that resolves with the data from the API response.
 * @throws {Error} Throws an error if the HTTP request fails.
 */
async function sendFlag(
  endPoint: string,
  flag: string,
  ip: string,
  password: string,
): Promise<boolean> {
  try {
    let response;
    if (!password || password.length === 0) {
      response = await axios.post<FlagResponse>(endPoint, {
        ip: ip,
        flag: flag,
      });
    } else {
      response = await axios.post<FlagResponse>(endPoint, {
        ip: ip,
        flag: flag,
        password: password,
      });
    }

    if (response.status === 200 && response.data.status === 'success') {
      return true;
    }
    return false;
  } catch (error) {
    return false;
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
  // Generative AI was used to fix this function after the Firebase client SDK was used instead of the correct admin one.
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
 * Increments the total number of flags injections attempted for a team in Firebase.
 * @param {string} teamId - The ID of the team.
 * @returns {Promise<void>} A promise that resolves once the database update is complete.
 */
async function updateTotal(teamId: string): Promise<void> {
  const teamRef = db.doc(`teams/${teamId}`);
  await teamRef.update({
    totalCount: FieldValue.increment(1),
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
 * 3. Updates the total flag injection attempts in Firestore.
 * 4. Attempts to inject the flag at the endpoint.
 * 5. If successful, it updates the valid flags in Firestore.
 * 6. If it fails, it increments the team's downCount in Firestore.
 * 7. Waits for a random delay between 2 to 3 minutes before repeating the process.
 * @param {Array<Team>} teams - An array of Team interfaces.
 * @returns {Promise<void>} This function runs in an infinite loop and does not resolve.
 */
export async function flagService(
  teams: Array<Team>,
  scoringBotIp: string | null,
  scenario: Scenario,
): Promise<void> {
  if (teams.length === 0 || !scoringBotIp) return;

  // Parse services from the scenario config
  // Format: "8081:email,8082:skyrewards"
  const services = [];
  if (scenario.bot_services) {
    const parts = scenario.bot_services.split(',');
    for (const part of parts) {
      const [port, name] = part.split(':');
      if (port && name) services.push({port: port.trim(), name: name.trim()});
    }
  } else {
    return;
  }

  console.log('Flag service started for', teams[0].sessionId);
  while (await isSessionActive(teams[0].sessionId)) {
    for (const team of teams) {
      if (!team.ipAddress) continue;

      for (const service of services) {
        const endPoint = `http://${scoringBotIp}:${service.port}/inject`;
        const flag = genFlag('cybrbtls', false);

        try {
          await updateTotal(team.id);

          const success = await sendFlag(
            endPoint,
            flag,
            team.ipAddress,
            team.password,
          );

          if (!success) throw new Error('Flag injection failed');

          console.log(`[${service.name}] Flag success: ${team.id}`);
          updateFlag(team.id, flag);
        } catch (error) {
          console.error(`[${service.name}] Flag failed: ${team.id} - ${error}`);
          updateDown(team.id);
        }
      }
    }
    const delay = Math.floor(Math.random() * (180000 - 120000)) + 120000;
    await sleep(delay);
  }
}
