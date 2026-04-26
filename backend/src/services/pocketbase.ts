import PocketBase from 'pocketbase';
import dotenv from 'dotenv';

dotenv.config();

const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
export const pb = new PocketBase(pbUrl);
pb.autoCancellation(false);

/**
 * Authenticates the backend server with PocketBase as an Admin.
 * Needs to be called once the Node server starts in index.ts.
 */
export async function initDatabase() {
  try {
    const email = process.env.PB_ADMIN_EMAIL!;
    const password = process.env.PB_ADMIN_PASSWORD!;
    
    await pb.admins.authWithPassword(email, password);
    console.log('Successfully authenticated with PocketBase Admin API.');
  } catch (error) {
    console.error('Failed to authenticate with PocketBase:', error);
    process.exit(1);
  }
}
