import {initializeApp, ServiceAccount, cert} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import * as serviceAccount from '../../cyberbattles-dd31f-18566f4ef322.json';

initializeApp({
  credential: cert(serviceAccount as ServiceAccount),
});

export const db = getFirestore();
export const scenariosCollection = db.collection('scenarios');
