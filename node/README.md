# Docker Orchestration Server Testing Guide


This code is only designed and tested on Linux, please use a Linux VM or WSL when testing.

### Prerequisites

- **Docker:** Ensure Docker is installed and the daemon is running. You can verify your installation by opening a terminal and running the command below:

  ```
  docker -v
  ```
### 1. Backend Setup

First, get the Node.js server running.

1. ```
   cd node
   npm i
   npx tsc
   node build/src/server.js
   ```


2. The backend server is now running. You can access the example XtermJS page at `http://localhost:1337`.

### 2. Frontend Setup

Next, start the Next.js frontend application in a new terminal.


1.  Open a **new terminal window or tab**.
    
2.    
    ```
    cd cyberbattles-frontend
    npm install
    npm run dev
    ```
    
3.  The development server will start. Navigate to the URL provided in your terminal (this is usually `http://localhost:3000`).
    

### 3. Testing Workflow

Follow these steps to test the full user flow.

1.  **Authenticate and Get JWT**
    
    -   In the frontend application (`http://localhost:3000`), create an account or sign in.
        
    -   On the dashboard, click to reveal your **JWT** and copy it.
        
2.  **Create a Docker Session**
    
    -   Open the Docker Terminal admin page at `http://localhost:1337`.
        
    -   Paste your copied JWT into the **Admin JWT** field.
        
    -   To create a session, change values to your liking, and click "Create Session".
        
3.  **Join a Team**
    
    -   Switch back to the terminal where your **backend server** is running. Copy one of the **Team IDs**.
        
    -   Return to the frontend dashboard (`http://localhost:3000`), paste the Team ID into the **Join a Team** field, and submit. You should see a success message.
        
4.  **Start the Session** and then **Connect to the Terminal**
    
    -   Go back to the Docker Terminal admin page (`http://localhost:1337`) and click Start Session.

    -   Once started, the Team IDs and User ID dropdowns will autofill. Select the team that you joined previously, there should only be one User ID. I will add the ability to see your own User ID for convenience later.
        
    -   Your JWT will be autofilled from the first time it was entered, if you want to test the token of another user you can change it still. Otherwise leave it as is.
        
    -   Click to connect.

