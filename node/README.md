# Orchestration Server README

- [How to Add New Challenges/Scenarios](#how-to-add-new-challengesscenarios)
- [ExpressJS API Endpoints](#expressjs-api-endpoints)
  - [`POST /api/session`](#post-apisession)
  - [`POST /api/start-session`](#post-apistart-session)
  - [`GET /api/cleanup/:sessionId/:token`](#get-apicleanupsessionidtoken)
  - [`GET /api/config/:sessionId/:teamId/:userId/:token`](#get-apiconfigsessionidteamiduseridtoken)
  - [`WS /terminals/:teamId/:userId/:token`](#ws-apiterminalsteamiduseridtoken)
  - [`GET /api/captures/:teamId/:token`](#get-apicapturesteamidtoken)
  - [`GET /api/health/:token`](#get-apihealthtoken)
- [Docker Orchestration Server Testing Guide](#docker-orchestration-server-testing-guide)
  - [Prerequisites](#prerequisites)
  - [1. Backend Setup](#1-backend-setup)
  - [2. Frontend Setup](#2-frontend-setup)
  - [3. Testing Workflow](#3-testing-workflow)

# How to Add New Challenges/Scenarios

To add a new challenge/scenario, you need to create a new folder in the `node/dockerfiles` directory.
The folder name will be used as the scenario name throughout the application. The folder must contain a valid `Dockerfile`, a `metadata.csv` file, other dependencies (e.g. those that are copied in the Dockerfile) can be placed there as well.

The format of the `metadata.csv` file is as follows, where the first column is the field name and the second column is the value (which you should change):

```csv
scenario_title, An Awesome Example Scenario
scenario_description, A nicely written description of the scenario.
scenario_difficulty, Easy
```

Before syncing, a unique ID will be generated for the scenario, the folder will be renamed to this ID, and the metadata will be stored in Firebase. The scenario ID will be used when creating sessions.

**Any** scenario you add to this folder will automatically sync with Firebase, similarly any added online
will be automatically downloaded and built by the backend server on startup.

**A 100MB limit is enforced on the size of the scenario folder.**

# ExpressJS API Endpoints

## `POST /api/session`

This endpoint **creates a new session**.

**Request Body:**

- `scenaroId`: string - The ID of the scenario to use.
- `numTeams`: `number` - How many teams to create.
- `numMembersPerTeam`: `number` - How many members each team should have.
- `token`: `string` - The sender's JWT token.

**Responses:**

- `201 Created`: The session was created successfully. The body will be a JSON object like `{ "result": { "sessionId": "...", "teamIds": ["...", "..."] } }`.
- `400 Bad Request`: The request body is missing data or has the wrong types.
- `401 Unauthorized`: The provided token is invalid.
- `500 Internal Server Error`: Something went wrong on the server.

## `POST /api/start-session`

This endpoint **starts a previously created session**.

**Request Body:**

- `sessionId`: `string` - The ID of the session to start.
- `token`: `string` - The sender's JWT token.

**Responses:**

- `200 OK`: The session started successfully. The body will be a JSON object like `{ "result": "Session started", "teamsAndMembers": { "teamId1": ["user1", "user2"], ... } }`.
- `400 Bad Request`: The `sessionId` is invalid or the session couldn't be started (e.g., not enough users joined).
- `401 Unauthorized`: The provided token is invalid.
- `500 Internal Server Error`: Something went wrong on the server.

## `GET /api/cleanup/:sessionId/:token`

This endpoint **terminates and cleans up all resources** associated with a given session. This is a destructive action that stops and removes all related Docker containers, networks, and deletes session data from the database. 🧹

**URL Parameters:**

- `sessionId`: `string` - The ID of the session you want to delete.
- `token`: `string` - The authentication token of the user who created the session.

**Responses:**

- `200 OK`: The session and all its resources were successfully removed. The response body will be a plain text message: `Session cleaned up successfully`.
- `400 Bad Request`: The `sessionId` parameter is invalid.
- `401 Unauthorized`: The provided token is invalid.
- `403 Forbidden`: The user attempting the cleanup is **not the original admin** who created the session.
- `404 Not Found`: The session with the specified ID does not exist.
- `500 Internal Server Error`: The server failed during the cleanup process. This can happen if the session document couldn't be deleted after the cleanup actions were performed.

## `GET /api/config/:sessionId/:teamId/:userId/:token`

This endpoint **retrieves a user's WireGuard VPN configuration**.

**URL Parameters:**

- `sessionId`: `string` - The session the user is in.
- `teamId`: `string` - The team the user is in.
- `userId`: `string` - The user's ID.
- `token`: `string` - The user's JWT token. The user ID derived from this token must match the `userId` in the URL.

**Responses:**

- `200 OK`: The request was successful. The body will be a JSON object containing the config file text, a Base64 encoded QR code, the username, and the team's container IP address: `{ "config": "...", "qrCode": "...", "username": "...", "ipAddress": "..." }`.
- `400 Bad Request`: The URL parameters are invalid.
- `401 Unauthorized`: The token is invalid or doesn't match the `userId`.
- `403 Forbidden`: The specified user is not a member of the specified team.
- `404 Not Found`: The user or team could not be found in the database.
- `500 Internal Server Error`: The server failed to read the configuration files or encountered another error.

## `WS /terminals/:teamId/:userId/:token`

This endpoint **establishes a WebSocket connection** to provide an interactive terminal session within a team's specific Docker container.

**Connection URL Parameters:**

- `teamId`: `string` - The ID of the team whose container you want to access.
- `userId`: `string` - The user's ID.
- `token`: `string` - The user's JWT token. The user ID associated with this token must match the `userId` in the URL.

**Connection Behavior:**

- On a successful connection, the server starts a `/bin/bash` shell inside the specified team's Docker container.
- Any data sent from the client through the WebSocket is piped directly to the shell's standard input.
- Any data from the shell's standard output and standard error is sent back to the client.

**Disconnection Reasons (Close Codes):**
The server will close the connection with a specific code if an issue occurs:

- `1011 Internal Error`: Sent if the connection URL is malformed, the target container can't be found, or a stream error happens.
- `4001 Unauthorized`: The provided token is invalid or doesn't match the `userId`.
- `4002 Not Started`: The session that the team belongs to has not been started yet.
- `4003 Forbidden`: The specified user is not a member of the requested team.

## `GET /api/captures/:teamId/:token`

This endpoint **downloads the network packet capture (`.pcap`) file** for a specific team's container. A `.pcap` file contains network traffic data that can be analyzed with tools like Wireshark.

**URL Parameters:**

- `teamId`: `string` - The ID of the team whose capture file you want to download.
- `token`: `string` - The JWT token for a user who is a member of that team.

**Responses:**

- `200 OK`: The request was successful. The server will respond with the `.pcap` file.
- `400 Bad Request`: The `teamId` parameter is invalid.
- `401 Unauthorized`: The provided token is invalid.
- `403 Forbidden`: The user associated with the token is not a member of the specified team.
- `404 Not Found`: The team does not exist, or the capture file for that team could not be found on the server.
- `500 Internal Server Error`: The server encountered an error while trying to read and send the file.

## `GET /api/health/:token`

This endpoint provides a **health check of the server** with two levels of detail. Its behavior changes based on whether a valid authentication token is provided.

**URL Parameter (Optional):**

- `token`: `string` - A token string must be provided in the URL. If the token is **valid**, the response will include detailed system information. If the token is **invalid or a placeholder**, a basic "OK" response is returned.

**Responses:**

- `200 OK`: This status code is returned for both successful basic and detailed checks.

  - **If the no token is provided, or the token is invalid**, you'll receive a simple plain text response confirming the server is online: `OK`

  - **If the provided token is valid**, you'll receive a detailed JSON object with the server status and information from the Docker daemon:

    ```JSON
    {
      "status": "ok",
      "docker": {
        "status": "healthy",
        "containers": 15,
        "containersRunning": 12,
        "containersPaused": 0,
        "containersStopped": 3,
        "images": 25,
        "serverVersion": "24.0.5",
        "memTotal": 16777216000,
        "cpuCores": 8
      },
      "subnetsRemaining": 224,
      "wgPortsRemaining": 200,
    }
    ```

- `500 Internal Server Error`: This only occurs if a **valid token** is provided but the server fails to retrieve health information from the Docker service. The response body will be `{ "status": "error", "message": "..." }`.

# Docker Orchestration Server Testing Guide

This code is only designed and tested on Linux, please use either a Linux computer, Linux VM or WSL when testing.

## Prerequisites

- **Docker:** Ensure Docker is installed and the daemon is running. You can verify your installation by opening a terminal and running the command below. It should output a version number.

  ```
  docker -v
  ```

  If Docker is not installed:

  - For WSL (it seems to work fine on my end) you'll need [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/).
  - For any Linux VM you can just install [Docker Engine](https://docs.docker.com/engine/install/).

- **NodeJS:** Ensure Node (and NPM) is installed by running the commands below. It should output two version numbers.

  ```
  npm -v ; node -v
  ```

  If Node and NPM aren't installed:

  - Run `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash` to install _Node Version Manager_, then `nvm install 22` to install NPM and Node v22.

- **WireGuard:** Ensure WireGuard is installed and running. You can verify your installation by opening a terminal and running the command below. It should output a version number.

  ```
  wg -v
  ```

  If WireGuard isn't installed:

  - Visit [wireguard.com/install](https://www.wireguard.com/install/) and follow the instructions for your device.

### 1. Backend Setup

Then, get the Node.js server running.

1. ```
   cd node
   npm i
   npx tsc
   node build/src/server.js
   ```

2. If you haven't run the server before (or have added new Dockerfiles to the `dockerfiles` dir) then this _will_ take a while, as it prebuilds all the provided scenarios. The backend server is now running. You can access the example XtermJS page at `http://localhost:1337`.

### 2. Frontend Setup

Next, start the Next.js frontend application in a new terminal.

1. Open a **new terminal window or tab**.

2. ```
   cd cyberbattles-frontend
   npm install
   npm run dev
   ```

3. The development server will start. Navigate to the URL provided in your terminal (this is usually `http://localhost:3000`), you'll want this open in two separate browsers (or regular & incognito mode in one browser) for testing multiple accounts.

### 3. Testing Workflow

Follow these steps to test the full user flow.

1. **Authenticate and Get JWT**

   - In the frontend application (`http://localhost:3000`), create an account or sign in.
   - On the dashboard, click to reveal your **JWT** and copy it.

   - Create or sign in to another account in your other browser/incognito tab.

2. **Create a Docker Session**

   - Open the Docker Terminal admin page at `http://localhost:1337`.
   - Paste your copied JWT into the **Admin JWT** field.
   - To create a session, change values to your liking, and click "Create Session". (For this example it will assume you have created 2 teams with 1 user each). The Scenario will default to the example, but this can be changed to any scenario you have added to the `node/dockerfiles` directory.

3. **Join Different Teams on Different Web Accounts** (repeat this for each account)

   - Switch back to the terminal where your **backend server** is running. Copy one of the **Team IDs**.
   - Return to the frontend dashboard (`http://localhost:3000`), paste the Team ID into the **Join a Team** field, and submit. You should see a success message.

4. **Start the Session** and then **Connect to the Web Terminal**

   - Go back to the Docker Terminal admin page (`http://localhost:1337`) and click Start Session. _NOTE:_ this can take a while (e.g. 30-120 seconds) it is having to run updates inside the container and execute a few commands.

   - Once started, the Team IDs and User ID dropdowns will autofill. Select the team that you joined previously, unless you've added other users there should only be your **User ID** in the **User ID** field.
   - Your JWT will be autofilled from the first time it was entered, if you want to test the token of another user you can change it still. Otherwise leave it as is.
   - Click to connect.

5. **Connect to the Other User via SSH**

   - Go back to the Docker Terminal admin page at `http://localhost:1337`, and in the `Connect to Terminal` menu, select the other team _and_ other user you created/joined with.
   - Click the `Get Config` button, that is next to the `Connect to Terminal`
   - Click the `Download .conf` button, and run the suggested command below the QR Code. Copy and paste it directly into your terminal and just run it, you will be prompted for a SSH password (which is the same as your username).
   - Voila! You now have an SSH connection _and_ a Web Terminal connection. You can now communicate with between users, without the other user knowing where the traffic is coming from.

6. **(Optional) Access Network Activity of Your Team's Container**
   - Go back to the Docker Terminal admin page at `http://localhost:1337`, and in the `Connect to Terminal` menu, click the `View PCAP` button, this will load an overlay with the _live_ network activity of your Container's **WireGuard** interface i.e. any traffic travelling between containers (not over the network), so if you've SSH'ed into that container for example.
