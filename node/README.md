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

Only addition I need to make to this PR is you _should_ run this before getting started:
`sudo docker build -t challenge_example node/dockerfiles/challenge_example`

Automatic building of images is still not working perfectly, and takes a _really long time_. That's being worked on.

Then, get the Node.js server running.

1. ```
   cd node
   npm i
   npx tsc
   node build/src/server.js
   ```

2. The backend server is now running. You can access the example XtermJS page at `http://localhost:1337`.

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
   - To create a session, change values to your liking, and click "Create Session". (For this example it will assume you have created 2 teams with 1 user each.

3. **Join Different Teams on Different Web Accounts** (repeat this for each account)

   - Switch back to the terminal where your **backend server** is running. Copy one of the **Team IDs**.
   - Return to the frontend dashboard (`http://localhost:3000`), paste the Team ID into the **Join a Team** field, and submit. You should see a success message.

4. **Start the Session** and then **Connect to the Web Terminal**

   - Go back to the Docker Terminal admin page (`http://localhost:1337`) and click Start Session. _NOTE:_ this will take a while (e.g. 30-120 seconds) it is having to run updates inside the container and execute a few commands.

   - Once started, the Team IDs and User ID dropdowns will autofill. Select the team that you joined previously, unless you've added other users there should only be your **User ID** in the **User ID** field.
   - Your JWT will be autofilled from the first time it was entered, if you want to test the token of another user you can change it still. Otherwise leave it as is.
   - Click to connect.

5. **Connect to the Other User via SSH**:

   - On your host machine, open a new terminal window and navigate to the `node` folder again.
   - Note the Team ID that you _didn't join_ from the Web Terminal (under the Connect to Terminal header).
   - Connect to the WireGuard VPN via the right config e.g.:

   ```
   sudo wg-quick up wg-configs/1b3a0125279ded35/1-member-4abb4814f007e817/wg1.conf
   ```

   Where here `1b3a0125279ded35` is the `Session ID` and `4abb4814f007e817` is the Team ID.
   You should get an output that looks something like this:

   ```
   [#] ip link add wg1 type wireguard
   [#] wg setconf wg1 /dev/fd/63
   [#] ip -4 address add 10.12.0.4 dev wg1
   [#] ip link set mtu 1420 up dev wg1
   [#] ip -4 route add 10.12.0.0/24 dev wg1
   ```

   - Found out the correct IP to connect to by running the `ip a` in the Web Terminal, the output should look like this. Note your WireGuard IP Address (example bolded below):

   ```
   me2@fcf4e7a616e5:/$ ip a
   1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000
       link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00
       inet 127.0.0.1/8 scope host lo
          valid_lft forever preferred_lft forever
       inet6 ::1/128 scope host
          valid_lft forever preferred_lft forever
   2: eth0@if63: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default
       link/ether 4e:1c:ff:fd:ed:53 brd ff:ff:ff:ff:ff:ff link-netnsid 0
       inet 172.12.24.2/24 brd 172.12.24.255 scope global eth0
          valid_lft forever preferred_lft forever
   3: wg0: <POINTOPOINT,NOARP,UP,LOWER_UP> mtu 1420 qdisc noqueue state UNKNOWN group default qlen 1000
       link/none
       inet **10.12.0.2**/32 scope global wg0
          valid_lft forever preferred_lft forever
   me2@fcf4e7a616e5:/$
   ```

   - For this test, where there is only two teams, if your IP Address ends in `.2` then you should SSH to `10.12.0.3`. Or the other way around if your IP Address ends in `.3`. E.g my second user has the username and password `me2`.

   ```
   ssh me2@10.12.0.3
   ```

   - Voila! You now have an SSH connection _and_ a Web Terminal connection. You can now communicate with between users, without the other user knowing where the traffic is coming from.
