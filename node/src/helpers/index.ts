import * as crypto from 'crypto';
import {getAuth} from 'firebase-admin/auth';
import * as path from 'path';
import * as fs from 'fs/promises';

const availableWGPorts: number[] = [];
const availableSubnets: string[] = [];

// Populate available subnets and WireGuard ports
for (let i = 24; i < 255; i++) {
  availableSubnets.push(`172.12.${i}.0/24`);
  availableWGPorts.push(51796 + i);
}

/**
 * Retrieves an available WireGuard port from the pool.
 * @returns A number representing the available WireGuard port, or null if none are available.
 */
export function getAvailableWGPort(): number | null {
  if (availableWGPorts.length === 0) {
    // No available ports
    return null;
  }
  return availableWGPorts.pop() || null;
}

/**
 * Releases a previously allocated WireGuard port back to the pool.
 * @param port The WireGuard port to release.
 */
export function releaseWGPort(port: number): void {
  if (!availableWGPorts.includes(port)) {
    availableWGPorts.push(port);
  }
}

/**
 * Returns the number of remaining available WireGuard ports.
 * @returns The count of available WireGuard ports.
 */
export function wgPortsRemaining(): number {
  return availableWGPorts.length;
}

/**
 * Retrieves an available subnet from the pool.
 * @returns A string representing the available subnet, or null if none are available.
 */
export function getAvailableSubnet(): string | null {
  if (availableSubnets.length === 0) {
    // No available subnets
    return null;
  }
  return availableSubnets.pop() || null;
}

/**
 * Returns the number of remaining available subnets.
 * @returns The count of available subnets.
 */
export function subnetsRemaining(): number {
  return availableSubnets.length;
}

/**
 * Releases a previously allocated subnet back to the pool.
 * @param subnet The subnet to release.
 */
export function releaseSubnet(subnet: string): void {
  if (!availableSubnets.includes(subnet)) {
    availableSubnets.push(subnet);
  }
}

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
 * Reads a WireGuard configuration file of a team's container and extracts the interface Address.
 * @param filePath The path to the conf file.
 * @returns A Promise that resolves to the IP address string, or 'unknown' if not found.
 */
export async function getWgAddress(
  sessionId: string,
  teamId: string,
): Promise<string> {
  const filePath = path.resolve(
    __dirname,
    `../../../wg-configs/${sessionId}/container-${teamId}/wg0.conf`,
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
