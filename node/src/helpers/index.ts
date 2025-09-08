import * as crypto from 'crypto';
import {getAuth} from 'firebase-admin/auth';
import * as path from 'path';
import * as fs from 'fs/promises';

/**
 * Generates a unique ID using crypto.randomBytes.
 *
 * @returns A string representing a unique ID.
 */
export function generateId(): string {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Verifies a Firebase ID token and returns the user's UID.
 * @param token The Firebase ID token to verify.
 * @returns A Promise that resolves with the user's UID string.
 */
export async function verifyToken(token: string): Promise<string> {
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
 * Reads a WireGuard configuration file and extracts the interface Address.
 * @param filePath The path to the conf file.
 * @returns A Promise that resolves to the IP address string, or 'unknown' if not found.
 */
export async function getWgAddress(
  sessionId: string,
  teamId: string,
  configNumber: number,
): Promise<string> {
  const filePath = path.resolve(
    __dirname,
    `../../../wg-configs/${sessionId}/${configNumber}-member-${teamId}/wg1.conf`,
  );

  try {
    // Read and process the file
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const lines = fileContent.split('\n');

    // Iterate over each line to find the 'Address' field.
    for (const line of lines) {
      const trimmedLine = line.trim();

      // Return the address if found
      if (trimmedLine.startsWith('Address =')) {
        return trimmedLine.split('=')[1].trim();
      }
    }

    // If not found, return 'unknown'
    return 'unknown';
  } catch (error) {
    console.error('Error reading a WireGuard configuration file:', error);
    return 'unknown';
  }
}
