import {docker} from './docker';
import {exec, execSync} from 'child_process';
import * as path from 'path';

/**
 * Starts capturing (wireguard) network traffic for a given Docker container using tcpdump.
 * The captured data is saved to {containerId}.pcap file in the given output directory.
 * @param teamId - The team ID associated with the container.
 * @param containerId - The ID of the Docker container to capture traffic from.
 * @param outputPath - The directory where the .pcap file will be saved.
 */
export async function startTrafficCap(
  teamId: string,
  containerId: string,
  outputPath: string,
): Promise<void> {
  console.log('Starting traffic capture for container:', containerId);
  const containerInfo = await docker.getContainer(containerId).inspect();
  const pid = containerInfo.State.Pid;
  const outputFilePath = path.join(outputPath, `${teamId}.pcap`);

  if (!pid || pid === 0) {
    console.error('Invalid PID retrieved for container:', containerId);
  }

  const command = `sudo nsenter -t ${pid} -n nohup tcpdump -i wg0 -U -w ${outputFilePath} &`;

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error starting tcpdump: ${stderr}`);
    }
  });
  console.log(`Capture started for container ${containerId}.`);
}

/**
 * Stops capturing (wireguard) network traffic for a given Docker container.
 * @param containerId - The ID of the Docker container to stop capturing traffic from.
 */
export async function stopTrafficCap(containerId: string): Promise<void> {
  const containerInfo = await docker.getContainer(containerId).inspect();
  const pid = containerInfo.State.Pid;

  if (!pid || pid === 0) {
    console.error('Invalid PID retrieved for container:', containerId);
    return;
  }

  const command = `sudo nsenter -t ${pid} -n pkill tcpdump`;

  execSync(command);
}
