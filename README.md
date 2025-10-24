# cyberbattles

### Frontend

The website can be accessed at [https://cyberbattl.es/](https://cyberbattl.es/) It is really simple to get started, simply create an account and dive in. This is the preferred way for the platform to be used.

Alternatively, you can run the website locally. When run locally the website will assume the backend server is also run on localhost. Unless a `.env.local` file exists in the website directory. Remove or rename this .env.local file to run fully locally. 

1. Ensure you have [node and npm](https://nodejs.org/en/download/) installed on your machine. You can verify this by entering *npm \-v* and *node \-v* into your terminal.  
2. Then, obtain the repository. We have submitted a .zip containing all source code through Blackboard.

Navigate to the repository.   
`cd cyberbattles-frontend`  
*`npm i`*  
*`npm start`*

The website can then be accessed at [http://localhost:3000/](http://localhost:3000/) 

### Backend

# ExpressJS API Endpoints

## `POST /api/session`

This endpoint **creates a new session**.  
**Request Body:**

- `scenarioId`: `string` \- The ID of the scenario to use.  
- `numTeams`: `number` \- How many teams to create.  
- `numMembersPerTeam`: `number` \- How many members each team should have.  
- `token`: `string` \- The sender's JWT token.

**Responses:**

- `201 Created`: The session was created successfully. The body will be a JSON object like `{"result": {"sessionId": "...", "teamIds": ["...", "..."]}}`.  
- `400 Bad Request`: The request body is invalid. The response body will be a JSON object with a `result` key explaining the issue.  
  - **Example Body 1:** `{"result": "Invalid request body"}`  
  - **Example Body 2:** `{"result": "numTeams must be between 1 and 5 (inclusive)"}`


- `401 Unauthorized`: The provided token is invalid. The response body will be **empty**.  
- `500 Internal Server Error`: An unexpected error occurred on the server during session creation (e.g., failed to create a network, container creation failed). The response body will be a JSON object detailing the error.  
    
  - **Example Body:** `{"result": "Error creating session: <specific error message>"}`

## `POST /api/start-session`

This endpoint **starts a previously created session**.  
**Request Body:**

- `sessionId`: `string` \- The ID of the session to start.  
- `token`: `string` \- The sender's JWT token.

**Responses:**

- `200 OK`: The session started successfully. The body will be a JSON object like `{"result": "Session <sessionId> started successfully.", "teamsAndMembers": {"Team-1": ["user1", "user2"], ...}}`.  
- `400 Bad Request`: The request is invalid or the session cannot be started. The response body will be a JSON object with a `result` key explaining the issue.  
  - **Example Body 1:** `{"result": "Invalid session ID"}`  
  - **Example Body 2:** `{"result": "Session not found."}`  
  - **Example Body 3:** `{"result": "Session is already started."}`  
  - **Example Body 4:** `{"result": "Only the session admin can start the session."}`  
- `401 Unauthorized`: The provided token is invalid. The response body will be **empty**.  
- `500 Internal Server Error`: An unexpected error occurred on the server while trying to start the session. The response body will be a JSON object detailing the error.  
  - **Example Body:** `{"result": "Error starting session: <specific error message>"}`

## `GET /api/cleanup/:sessionId/:token`

This endpoint **terminates and cleans up all resources** associated with a given session. This is a destructive action that stops and removes all related Docker containers, networks, and deletes session data from the database.   
**URL Parameters:**

- `sessionId`: `string` \- The ID of the session you want to delete.  
- `token`: `string` \- The authentication token of the user who created the session.

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

- `sessionId`: `string` \- The session the user is in.  
- `teamId`: `string` \- The team the user is in.  
- `userId`: `string` \- The user's ID.  
- `token`: `string` \- The user's JWT token. The user ID derived from this token must match the `userId` in the URL.

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

- `teamId`: `string` \- The ID of the team whose container you want to access.  
- `userId`: `string` \- The user's ID.  
- `token`: `string` \- The user's JWT token. The user ID associated with this token must match the `userId` in the URL.

**Connection Behavior:**

- On a successful connection, the server starts a `/bin/bash` shell inside the specified team's Docker container.  
- Any data sent from the client through the WebSocket is piped directly to the shell's standard input.  
- Any data from the shell's standard output and standard error is sent back to the client.

**Disconnection Reasons (Close Codes):** The server will close the connection with a specific code if an issue occurs:

- `1011 Internal Error`: Sent if the connection URL is malformed, the target container can't be found, or a stream error happens.  
- `4001 Unauthorized`: The provided token is invalid or doesn't match the `userId`.  
- `4002 Not Started`: The session that the team belongs to has not been started yet.  
- `4003 Forbidden`: The specified user is not a member of the requested team.

## `GET /api/captures/:teamId/:token`

This endpoint **downloads the network packet capture (`.pcap`) file** for a specific team's container. A `.pcap` file contains network traffic data that can be analyzed with tools like Wireshark.  
**URL Parameters:**

- `teamId`: `string` \- The ID of the team whose capture file you want to download.  
- `token`: `string` \- The JWT token for a user who is a member of that team.

**Responses:**

- `200 OK`: The request was successful. The server will respond with the `.pcap` file.  
- `400 Bad Request`: The `teamId` parameter is invalid.  
- `401 Unauthorized`: The provided token is invalid.  
- `403 Forbidden`: The user associated with the token is not a member of the specified team.  
- `404 Not Found`: The team does not exist, or the capture file for that team could not be found on the server.  
- `500 Internal Server Error`: The server encountered an error while trying to read and send the file.

## 

## `GET /api/health/:token`

This endpoint provides a **health check of the server** with two levels of detail. Its behavior changes based on whether a valid authentication token is provided.

**URL Parameter (Optional):**

- `token`: `string` \- A token string must be provided in the URL. If the token is **valid**, the response will include detailed system information. If the token is **invalid or a placeholder**, a basic "OK" response is returned.

**Responses:**

- `200 OK`: This status code is returned for both successful basic and detailed checks.  
    
  - **If the no token is provided, or the token is invalid**, you'll receive a simple plain text response confirming the server is online: `OK`  
      
  - **If the provided token is valid**, you'll receive a detailed JSON object with the server status and information from the Docker daemon.


- `500 Internal Server Error`: This only occurs if a **valid token** is provided but the server fails to retrieve health information from the Docker service. The response body will be `{ "status": "error", "message": "..." }`.

# Docker Orchestration Server Guide

This code is only designed and tested on Linux, please use either a Linux computer, Linux VM or when using. WSL probably won’t work due to Docker for Windows funkyness.

## Prerequisites

- **Docker:** Ensure Docker is installed and the daemon is running. You can verify your installation by opening a terminal and running the command below. It should output a version number.  
  `docker -v`

If Docker is not installed:

- For WSL (it seems to work fine on my end) you'll need [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/).  
  - For any Linux VM you can just install [Docker Engine](https://docs.docker.com/engine/install/).  
- **NodeJS:** Ensure Node (and NPM) is installed by running the commands below. It should output two version numbers.  
  `npm -v ; node -v`  
  If Node and NPM aren't installed:  
  - Run `curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash` to install *Node Version Manager*, then `nvm install 22` to install NPM and Node v22.


- **WireGuard:** Ensure WireGuard is installed and running. You can verify your installation by opening a terminal and running the command below. It should output a version number.  
  `wg -v`  
  If WireGuard isn't installed:  
  - Visit [wireguard.com/install](https://www.wireguard.com/install/) and follow the instructions for your device.  
- Sudo Permissions: Either the index.js file will need to be run with `sudo` or you need to add `nsenter` as a passwordless sudo command. To do this, run `sudo visudo` and add the following line to the end of the file, replacing `your-username` with your actual username:  
  `your-username ALL=(ALL) NOPASSWD: /usr/bin/nsenter`

### 1\. Backend Setup

The server requires four Docker images to be pre-built, auto-building was removed as it was unreliable due to ExpressJS and Streams funkyness. To build:  
```
`cd node`  
docker image build -t 073cbbf5ef263e71 dockerfiles/073cbbf5ef263e71
docker image build -t 82202c6ed1bf107e dockerfiles/82202c6ed1bf107e  
docker image build -t 8429abfca004aed7 dockerfiles/8429abfca004aed7  
docker image pull lscr.io/linuxserver/wireguard:latest
```
Then, get the Node.js server running (ensuring you're using sudo or have edited your sudoers file). 

1.
```
cd node
npm i 
npx tsc
node build/src/index.js
```
2. The backend server is now running at `http://localhost:1337`.
