import * as express from 'express';
import * as http from 'http';
// import * as path from 'path';
import * as cors from 'cors';
import {WebSocketServer} from 'ws';
import {handleWSConnection} from './services/websockets';
import apiRoutes from './routes';
import {cleanupAllSessions} from './services/sessions';
import {getScenarios} from './services/docker';
// import {syncFolders} from './services/sync';

const PORT = '1337';

async function main() {
  // Sync then build Docker images with Firestore
  // const dockerFiles = path.join(__dirname, '../../dockerfiles');
  // await syncFolders(dockerFiles);
  // console.log('Prebuilding Docker images...');

  await getScenarios();

  // Setup Express server and WebSocket server
  const app = express();

  // Allow all CORS origins and sanitize inputs
  app.use(cors({origin: '*'}));
  app.use(require('sanitize').middleware);

  const server = http.createServer(app);
  const wss = new WebSocketServer({server});
  app.use(express.json());

  // Handle API routes
  app.use('/api', apiRoutes);

  // Handle WebSocket connections
  await handleWSConnection(wss);

  server.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
  });
}

// Catch CTRL-C for graceful shutdown
process.on('SIGINT', async () => {
  console.log('\nCaught interrupt signal, beginning cleanup...');
  await cleanupAllSessions();
  process.exit(0);
});

// Start server
main().catch(err => {
  console.error('Error starting the server:', err);
});
