import * as crypto from 'crypto';
import {getAuth} from 'firebase-admin/auth';
import * as path from 'path';
import * as fs from 'fs/promises';

import {exec} from 'child_process';
import IPCIDR from 'ip-cidr';

const availableWGPorts: number[] = [];
const potentialSubnets: IPCIDR[] = [];
let availableSubnets: string[] = [];

// Populate available subnets and WireGuard ports
for (let i = 24; i < 255; i++) {
  potentialSubnets.push(new IPCIDR(`172.16.${i}.0/24`));
  availableWGPorts.push(51796 + i);
}

(async () => {
  availableSubnets = await filterAvailableSubnets(potentialSubnets)
    .then(subnets => subnets.map(s => s.toString()))
    .catch(() => {
      console.error('Failed to filter subnets');
      return [];
    });
})();

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
  return availableSubnets.pop()?.toString() || null;
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
 * Executes the `ip addr` command to get all CIDR blocks configured on the system.
 * @returns A promise that resolves to an array of existing CIDR strings.
 */
function getSystemCIDRs(): Promise<IPCIDR[]> {
  return new Promise((resolve, reject) => {
    // Execute the 'ip addr' command, which lists network interfaces and addresses.
    exec('ip addr', (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing 'ip addr': ${stderr}`);
        return reject(error);
      }

      // Use a regular expression to find all IPv4 CIDR notations in the output.
      const cidrRegex = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}\b/g;
      const foundCIDRs = stdout.match(cidrRegex) || [];

      // Convert to CIDR objects
      const addresses = foundCIDRs.map(cidr => new IPCIDR(cidr));

      resolve(addresses);
    });
  });
}

/**
 * Filters a list of potential subnets to find which ones are not already in use.
 * @param potentialSubnets An array of IPCIDR objects representing potential subnets.
 * @returns A promise that resolves to an array of available subnets.
 */
async function filterAvailableSubnets(
  potentialSubnets: IPCIDR[],
): Promise<IPCIDR[]> {
  try {
    const existingSubnets = await getSystemCIDRs();

    const availableSubnets = potentialSubnets.filter(potentialSubnet => {
      const isOverlapping = existingSubnets.some(existingBlock => {
        const aContainsB =
          existingBlock.contains(potentialSubnet.start()) ||
          existingBlock.contains(potentialSubnet.end());
        const bContainsA =
          potentialSubnet.contains(existingBlock.start()) ||
          potentialSubnet.contains(existingBlock.end());
        return aContainsB || bContainsA;
      });
      return !isOverlapping;
    });

    return availableSubnets;
  } catch (error) {
    console.error('Failed to filter subnets:', error);
    return potentialSubnets;
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
