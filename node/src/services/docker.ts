import * as Docker from 'dockerode';
import {Writable} from 'stream';
import * as path from 'path';
import * as fs from 'fs/promises';

const SCENARIOS: string[] = [];
const WIREGUARD_IMAGE = 'lscr.io/linuxserver/wireguard:latest';
let nextAvailableSubnet = 24;

export const docker = new Docker();

/**
 * A stream handler that ensures a Docker stream is fully consumed.
 * This is necessary for some Docker stuff to complete successfully.
 * @param stream The Docker stream to handle.
 * @returns A Promise that resolves to a boolean indicating if there was an error in the stream.
 */
async function handleStream(stream: NodeJS.ReadableStream): Promise<boolean> {
  // Create a null stream to output to
  const nullStream = new Writable({
    write(chunk, encoding, callback) {
      callback();
    },
  });

  // Redirect our output to the null stream
  // Without this line, code does not run ¯\_(ツ)_/¯
  docker.modem.demuxStream(stream, nullStream, nullStream);

  let streamError = false;

  // Await a promise that resolves when the stream ends.
  await new Promise<void>((resolve, reject) => {
    // Handle stream errors
    stream.on('error', err => {
      streamError = true;
      reject(err);
    });

    stream.on('end', () => {
      resolve();
    });

    stream.on('close', () => {
      resolve();
    });
  });

  return streamError;
}

/**
 * Retrieves the list of available scenario Docker images.
 * If the SCENARIOS array is empty, it starts the build process for all scenarios.
 * @returns A Promise that resolves to an array of scenario image tags.
 */
export async function getScenarios(): Promise<string[]> {
  if (SCENARIOS.length === 0) {
    await buildImages(path.resolve(__dirname, '../../../dockerfiles')).catch(
      err => {
        console.error('Error building Docker images:', err);
      },
    );
  }
  return SCENARIOS || [];
}

/**
 * Builds all provided scenarios found in the dockerfilesPath directory.
 * Stores the built image tags in the SCENARIOS array.
 * @param dockerfilesPath The path to the directory containing scenario subdirectories with Dockerfiles.
 */
async function buildImages(dockerfilesPath: string): Promise<void> {
  const dockerfiles = await fs.readdir(dockerfilesPath);

  // Iterate over each Dockerfile and build the image
  for (let file of dockerfiles) {
    const dockerfilePath = path.join(dockerfilesPath, file, 'Dockerfile');
    const imageTag = `${file}`;

    // Check if the image already exists
    const image = docker.getImage(imageTag);
    try {
      await image.inspect();
      console.log(`Image ${imageTag} already exists, skipping build.`);

      // Skip to the next Dockerfile
      SCENARIOS.push(imageTag);
      continue;
    } catch (error) {
      // Image does not exist, proceed to build
    }

    // Read all files and directories within the context path
    const contextPath = path.dirname(dockerfilePath);
    const contextFiles = await fs.readdir(contextPath);

    // Build the image
    console.log(`Building image with tag: ${imageTag}`);
    const stream = await docker.buildImage(
      {
        context: contextPath,
        src: contextFiles,
      },
      {
        t: imageTag,
      },
    );

    if (await handleStream(stream)) {
      console.error(`Error building image: ${imageTag}`);
    } else {
      console.log(`Successfully built image: ${imageTag}`);
      SCENARIOS.push(imageTag);
    }
  }
}

/**
 * A helper function to run a command in a container and show a loading indicator.
 * @param container The Docker Container in which the command will be run
 * @param command The command to run
 * @returns A Promise that resolves when the command finishes.
 */
export async function runCommandInContainer(
  container: Docker.Container,
  command: string[],
): Promise<void> {
  // Run command
  const exec = await container.exec({
    Cmd: command,
    AttachStdout: true,
    AttachStderr: true,
  });

  // Hijack stream
  const stream = await exec.start({});

  if (await handleStream(stream)) {
    throw new Error(`Error running command: ${command.join(' ')}`);
  }

  // Ensure the stream is properly closed
  stream.destroy();
}

/**
 * Creates a new user in the specified Docker container, with the given userName
 * and sudoers permissions. The user's password is set to be the same as their username.
 * @param containerId The ID of the Docker Container in which to create the user.
 * @param userName The userName to assign to the new user.
 */
export async function createUser(
  containerId: string,
  userName: string,
): Promise<void> {
  try {
    const container = docker.getContainer(containerId);

    // Update apt and install sudo command
    const installSudo = [
      '/bin/sh',
      '-c',
      'apt update && apt install sudo -y  > /dev/null 2>&1',
    ];

    // Create user and add them to sudoers command
    const addSudoUser = [
      '/bin/sh',
      '-c',
      `useradd -m -s /bin/bash ${userName} && usermod -aG sudo ${userName} && echo '${userName} ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers`,
    ];

    // Set a default password for the user command
    const setPassword = [
      '/bin/sh',
      '-c',
      `echo '${userName}:${userName}' | chpasswd`,
    ];

    // Update repo and install sudo
    await runCommandInContainer(container, installSudo);

    // Create user and add them to sudoers
    await runCommandInContainer(container, addSudoUser);

    // Set the user's password
    await runCommandInContainer(container, setPassword);
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Create User Error: ${error.message}`);
    }
    throw new Error('Create User Error: An unknown error occurred.');
  }
}

/**
 * Creates a Docker network with the given scenario ID.
 * Network names are formatted as `sessionNet-{sessionId}`.
 * @param sessionId The unique ID of the session.
 * @returns A Promise that resolves to an object containing the network ID, name and subnet.
 */
export async function createNetwork(
  sessionId: string,
): Promise<{networkId: string; networkName: string; networkSubnet: string}> {
  // Get the next available subnet
  const subnet = `172.12.${nextAvailableSubnet}.0/24`;

  const IPAM = {
    Driver: 'default',
    Config: [
      {
        Subnet: subnet,
        Gateway: `172.12.${nextAvailableSubnet}.1`,
      },
    ],
  };

  // Increment for next session
  nextAvailableSubnet += 1;

  // Create the network
  const networkName = `sessionNet-${sessionId}`;
  const networkId = await docker.createNetwork({
    Name: networkName,
    Driver: 'bridge',
    IPAM: IPAM,
  });

  // Retrieve the network
  const network = docker.getNetwork(networkId.id);

  // Get the network details to find the allocated subnet
  const networkData = await network.inspect();
  const networkSubnet =
    networkData.IPAM?.Config && networkData.IPAM.Config.length > 0
      ? networkData.IPAM.Config[0].Subnet
      : 'unknown';

  return {
    networkId: networkId.id,
    networkName: networkName,
    networkSubnet: networkSubnet,
  };
}

/**
 * Creates a Docker container for the team with the specified image, name, and team ID.
 * Attaches to the given network and configures WireGuard.
 * Container names are formatted as `teamcon-{teamName}-{teamId}`.
 * @param image The Docker image to use for the container.
 * @param teamName The name of the team.
 * @param teamId The unique ID of the team.
 * @param networkName The name of the Docker network to connect the container to.
 * @param sessionId The unique ID of the session.
 * @returns A Promise that resolves to the created Docker containerId.
 **/
export async function createTeamContainer(
  image: string,
  teamName: string,
  teamId: string,
  networkName: string,
  sessionId: string,
): Promise<string> {
  const container = await docker.createContainer({
    Image: image,
    name: `teamcon-${teamName}-${teamId}`,
    Tty: true,
    Env: ['PUID=1000', 'PGID=1000'],
    HostConfig: {
      CapAdd: ['NET_ADMIN'],
      Dns: ['1.0.0.1', '1.1.1.1'],
      NetworkMode: networkName,
      CpuQuota: 20_000, // This
      CpuPeriod: 100_000, // And this makes a 20% CPU Usage Limit
      Memory: 4294967296, // 4GB RAM Limit
      MemorySwap: 4294967296 * 2, // 4GB RAM + 4GB Swap Limit
      Sysctls: {
        'net.ipv4.conf.all.src_valid_mark': '1',
      },
      Binds: [
        `${path.resolve(__dirname, `../../../wg-configs/${sessionId}/container-${teamId}/wg0.conf`)}:/etc/wireguard/wg0.conf:ro,z`,
        `${path.resolve(__dirname, '../../../challenge-setup-script/supervisord.conf')}:/etc/supervisord.conf:ro,z`,
      ],
      RestartPolicy: {Name: 'unless-stopped'},
    },
  });
  return container.id;
}

/**
 * Creates and starts a WireGuard router container for the session.
 * Configures the container with the specified IP address and port,
 * and connects it to the given Docker network.
 * Container names are formatted as `wg-router-{sessionId}`.
 * @param sessionId The unique ID of the session.
 * @param networkName The name of the Docker network to connect the container to.
 * @param wgRouterIp The IP address to assign to the WireGuard router within the network.
 * @param wireguardPort The UDP port on which WireGuard will listen.
 * @param numTeams The number of teams in the session (used for peer config generation).
 * @param numMembersPerTeam The number of members per team (used for peer config generation).
 * @param teamIds The IDs of the teams in the session (used for peer config generation).
 * @returns A Promise that resolves to the created WireGuard router containerId.
 **/
export async function createWgRouter(
  sessionId: string,
  networkName: string,
  wgRouterIp: string,
  wireguardPort: number,
  numTeams: number,
  numMembersPerTeam: number,
  teamIds: string[],
): Promise<string> {
  // Check if the WireGuard image is already pulled
  const image = docker.getImage(WIREGUARD_IMAGE);
  try {
    await image.inspect();
    console.log('WireGuard image already exists, skipping pull.');
  } catch (error) {
    console.log('Pulling WireGuard image');
    await new Promise((resolve, reject) => {
      docker.pull(WIREGUARD_IMAGE, {}, (err: Error, stream) => {
        if (err) {
          return reject(err);
        }
        if (stream) {
          docker.modem.followProgress(stream, (err, output) => {
            if (err) {
              return reject(err);
            }
            resolve(output);
          });
        } else {
          reject(new Error('Docker pull stream is not available.'));
        }
      });
    });
    console.log('WireGuard Image pulled successfully.');
  }

  // Convert teamIds to space-seperated string
  const teamIdsStr = teamIds.join(' ');

  // Create wg-router, config provided by @Howard
  const container = await docker.createContainer({
    Image: 'lscr.io/linuxserver/wireguard:latest',
    name: `wg-router-${sessionId}`,
    Tty: false,
    Env: [
      'PUID=1000',
      'PGID=1000',
      `PEERS=${numTeams * numMembersPerTeam + numTeams}`,
      'INTERNAL_SUBNET=10.12.0.0/24',
      'ALLOWEDIPS=10.12.0.0/24',
      `SERVERURL=${wgRouterIp}`,
      'PERSISTENTKEEPALIVE_PEERS=all',
      `NUM_TEAMS=${numTeams}`,
      `NUM_PLAYERS=${numMembersPerTeam}`,
      `SERVER_IP=${wgRouterIp}`,
      `SERVER_PORT=${wireguardPort}`,
      `TEAM_IDS=${teamIdsStr}`,
    ],
    HostConfig: {
      CapAdd: ['NET_ADMIN'],
      Dns: ['1.0.0.1', '1.1.1.1'],
      Binds: [
        `${path.resolve(__dirname, `../../../wg-configs/${sessionId}`)}:/config:z`,
        `${path.resolve(__dirname, '../../../server-init-script')}:/custom-cont-init.d:ro,z`,
      ],
      PortBindings: {
        [`${wireguardPort}/udp`]: [{HostPort: `${wireguardPort}`}],
      },
      Sysctls: {
        'net.ipv4.conf.all.src_valid_mark': '1',
        'net.ipv4.ip_forward': '1',
      },
      RestartPolicy: {Name: 'unless-stopped'},
    },
    Healthcheck: {
      Test: ['CMD', 'test', '-f', `/config/${sessionId}/init_done`],
      Interval: 6000000000, // 6 seconds in nanoseconds
    },
    NetworkingConfig: {
      EndpointsConfig: {
        [networkName]: {
          IPAMConfig: {IPv4Address: wgRouterIp},
        },
      },
    },
  });
  console.log(`Starting wg-router container for Session: ${sessionId}...`);
  await container.start();
  const wgContainer = docker.getContainer(container.id);

  // Wait until init_done file is created by the container (i.e. container is healthy)
  console.log('Waiting for wg-router to become healthy...');
  let isHealthy = false;
  const initDonePath = path.resolve(
    __dirname,
    `../../../wg-configs/${sessionId}/`,
    'init_done',
  );

  // Loop for a maximum of 30 seconds
  for (let i = 0; i < 30; i++) {
    try {
      await fs.stat(initDonePath);

      console.log(`WireGuard Router for Session: ${sessionId} is healthy.`);
      isHealthy = true;
      break;
    } catch (error) {
      // The file does not exist yet.
    }

    // Wait for 1 second before the next check.
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  if (!isHealthy) {
    throw new Error(
      'WireGuard router container did not become healthy in time.',
    );
  }

  return wgContainer.id;
}
