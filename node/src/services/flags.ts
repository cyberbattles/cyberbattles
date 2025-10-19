import {db} from './firebase';
import {serverTimestamp} from 'firebase/firestore';
import {FieldValue} from 'firebase-admin/firestore';
import axios from 'axios';

export function genFlag(prefix: string, base64: boolean): string {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let flag = '';

  for (let i = 0; i < 8; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    flag += characters.charAt(randomIndex);
  }

  if (prefix.length > 0) {
    flag = prefix + '{' + flag + '}';
  }

  if (base64) {
    flag = Buffer.from(flag).toString('base64');
  }
  return flag;
}

async function sendFlag(
  endPoint: string,
  flag: string,
  ip: string,
  port: string,
): Promise<any> {
  try {
    const response = await axios.post(endPoint, {
      ip: ip,
      port: port,
      flag: flag,
    });
    return response.data;
  } catch (error) {
    throw error;
  }
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function updateFlag(
  teamId: string,
  index: number,
  flag: string,
): Promise<void> {
  const teamRef = db.doc(`teams/${teamId}`);

  await teamRef.update({
    [`activeFlags.${index}`]: flag,
    lastUpdated: serverTimestamp(),
  });
}

async function updateDown(teamId: string): Promise<void> {
  const teamRef = db.doc(`teams/${teamId}`);

  await teamRef.update({
    downCounts: FieldValue.increment(1),
  });
}

// Loop permanently sending in a flag every 2-3mins.
// Only concern is that a flag could inject and fail to check not updating it in firebase.
export async function main(
  endPoint: string,
  teamId: string,
  ip: string,
  port: string,
): Promise<void> {
  let index = 0;
  while (true) {
    const delay = Math.floor(Math.random() * (180000 - 120000)) + 120000;
    await sleep(delay);

    let flag = genFlag('cybrbtls', false);
    console.log(`Send team: ${teamId}, flag: ${flag}`);

    try {
      let response = await sendFlag(endPoint, flag, ip, port);

      console.log(`Flag injection succesful for: ${teamId}, flag: ${flag}`);
      sendFlag(endPoint, flag, ip, port);
      updateFlag(teamId, index % 3, flag);
      index += 1;
    } catch (error) {
      console.error(`Flag injection FAILED for: ${teamId}, flag: ${flag}`);

      updateDown(teamId);
    }
  }
}
