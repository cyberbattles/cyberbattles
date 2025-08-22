import express from 'express';
import * as http from 'http';
import WebSocket from 'ws';
import Docker from 'dockerode';
import {Duplex} from 'stream';
import crypto from 'crypto';
import { generate } from "random-words";

const PORT: string = '1337';
const CREATE_USER_CMD: string[] = ['useradd', '-m', '-s', '/bin/bash'];
const SESSIONS: Session[] = [];
const SCENARIOS: string[] = ['ubuntu:latest']

const docker = new Docker();

class User {
  username: string;
  id: string;

  public constructor(username: string, id: string) {
    this.username = username;
    this.id = id;
  }
}

class Team {
  name: string;
  numUsers: number;
  usernames: User[];
  container: Docker.Container;
  networkId: string;
  networkName: string;
  id: string;

  public constructor(name: string, numUsers: number, usernames: User[], container: Docker.Container, networkId: string, networkName: string) {
    this.name = name;
    this.numUsers = numUsers;
    this.usernames = usernames;
    this.container = container;
    this.networkId = networkId;
    this.networkName = networkName;
    this.id = generateId();
  }
}

class Session {
  teams: Team[];
  numTeams: number;
  numUsers: number;
  selectedScenario: number;
  id: string;

  public constructor(teams: Team[], numTeams: number, numUsers: number, selectedScenario: number) {
  this.teams = teams;
  this.numTeams = numTeams;
  this.numUsers = numUsers;
  this.selectedScenario = selectedScenario;
  this.id = crypto.randomBytes(16).toString('hex');
  }
}

function generateId(): string {
  return crypto.randomBytes(16).toString('hex');
}

async function createUser(container: Docker.Container): Promise<User> {
  const username: string[] = generate({min: 1, max:2, minlength:4, maxLength: 8, join: "-"})
  const id: string = generateId();
  const exec = await container.exec({
      Cmd: [...CREATE_USER_CMD, username],
      AttachStdout: true,
      AttachStderr: true,
  });
  await exec.start({});
  return new User(username, id);
}

async function createNetwork(teamId: string): Promise<{networkId: string, networkName: string}> {
  const networkName = `teamnet-${teamId}`;
  const networkId = await docker.createNetwork({ Name: networkName, Driver: 'bridge' });
  return {networkId: networkId.id, networkName: networkName};
}


async function createContainer(image: string, teamName: string, teamId: string): Promise<Docker.Container> {
  const container = await docker.createContainer({
    Image: image,
    Cmd: ['/bin/bash'],
    name: `teamcon-${teamName}-${teamId}`,
    Tty: true,
    HostConfig: {
      NetworkMode: `teamnet-${teamId}`,
    }
  });
  return container;
}

async function createTeam(name: string, numUsers: number): Promise<Team> {
  

async function startSession(teams: Team[], selectedScenario: number, numUsers: number): Promise<Session> {
  console.log(`--- Starting Scenario ${selectedScenario} Setup ---`);

    // Pull the Docker image
    console.log(`Pulling image: ${DOCKER_IMAGE}...`);
    await new Promise(resolve => docker.pull(DOCKER_IMAGE, {}, (err, stream) => {
        docker.modem.followProgress(stream, resolve); // Show progress
    }));
    console.log('Image pulled successfully.');
}

async function main() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocket.Server({server});

  app.use(express.static('public'));

  server.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
  });
}
