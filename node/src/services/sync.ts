import * as fs from 'fs/promises';
import * as path from 'path';
import * as admin from 'firebase-admin';

import JSZip = require('jszip');

import {scenariosCollection} from './firebase';

/**
 * A helper function to recursively read files in a directory.
 * @param dir The directory to read.
 * @returns An array of file paths relative to the starting directory.
 */
async function getFilePaths(dir: string): Promise<string[]> {
  const dirents = await fs.readdir(dir, {withFileTypes: true});
  const files = await Promise.all(
    dirents.map(dirent => {
      const res = path.resolve(dir, dirent.name);
      return dirent.isDirectory() ? getFilePaths(res) : Promise.resolve(res);
    }),
  );
  return Array.prototype.concat(...files);
}

/**
 * Zips a local folder and returns the data as a Buffer.
 * @param folderPath The absolute path to the folder to be zipped.
 * @returns A Promise that resolves with the zip data as a Buffer.
 */
async function zipFolder(folderPath: string): Promise<Buffer> {
  const zip = new JSZip();
  const filePaths = await getFilePaths(folderPath);

  for (const filePath of filePaths) {
    const relativePath = path.relative(folderPath, filePath);
    const content = await fs.readFile(filePath);
    zip.file(relativePath, content);
  }

  console.log(`Zipped folder: ${folderPath}`);
  return zip.generateAsync({type: 'nodebuffer', compression: 'DEFLATE'});
}

/**
 * Sends a zip buffer to Firestore, stored as a Base64 string.
 * @param folderId A unique identifier for the folder (e.g., the folder name).
 * @param zipBuffer The zip data as a Buffer.
 */
async function sendZipToFirestore(
  folderId: string,
  zipBuffer: Buffer,
): Promise<void> {
  const base64Data = zipBuffer.toString('base64');
  await scenariosCollection.doc(folderId).set({
    name: folderId,
    zipData: base64Data,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
  console.log(`Sent ${folderId} to Firestore.`);
}

/**
 * Receives a zip file from Firestore by its ID.
 * @param folderId The unique ID of the folder document in Firestore.
 * @returns A Promise that resolves with the zip data as a Buffer, or null if not found.
 */
async function receiveZipFromFirestore(
  folderId: string,
): Promise<Buffer | null> {
  const doc = await scenariosCollection.doc(folderId).get();

  if (!doc.exists) {
    console.log(`No document found for folder ID: ${folderId}`);
    return null;
  }

  const data = doc.data();
  if (!data || !data.zipData) {
    console.log(`Document for ${folderId} is missing zipData.`);
    return null;
  }

  console.log(` Received ${folderId} from Firestore.`);
  return Buffer.from(data.zipData, 'base64');
}

/**
 * Unzips a buffer into a specified local directory.
 * @param zipBuffer The zip data as a Buffer.
 * @param destinationPath The path where the files should be extracted.
 */
async function unzipToFolder(
  zipBuffer: Buffer,
  destinationPath: string,
): Promise<void> {
  // Ensure directory exists
  await fs.mkdir(destinationPath, {recursive: true});
  const zip = await JSZip.loadAsync(zipBuffer);

  for (const filename in zip.files) {
    const file = zip.files[filename];
    if (!file.dir) {
      const content = await file.async('nodebuffer');
      const fullPath = path.join(destinationPath, filename);
      const dirName = path.dirname(fullPath);

      // Ensure subdirectory exists before writing file
      await fs.mkdir(dirName, {recursive: true});
      await fs.writeFile(fullPath, content);
    }
  }
  console.log(`Unzipped files to: ${destinationPath}`);
}

/**
 * Sync function that compares local folders with Firestore
 * and performs uploads or downloads as needed.
 * @param localFoldersPath The parent directory containing all folders to be synced.
 * @param downloadedFoldersPath The directory where folders from Firestore will be saved.
 */
export async function syncFolders(
  localFoldersPath: string,
  downloadedFoldersPath: string,
) {
  // Get list of local folder names
  const localDirents = await fs.readdir(localFoldersPath, {
    withFileTypes: true,
  });
  const localFolderNames = localDirents
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

  // Get list of folder documents from Firestore
  const snapshot = await scenariosCollection.get();
  const firestoreFolderNames = snapshot.docs.map(doc => doc.id);

  // Find folders to upload (which exists locally, but not in Firestore)
  const foldersToUpload = localFolderNames.filter(
    name => !firestoreFolderNames.includes(name),
  );

  for (const folderName of foldersToUpload) {
    const folderPath = path.join(localFoldersPath, folderName);
    const zipBuffer = await zipFolder(folderPath);
    await sendZipToFirestore(folderName, zipBuffer);
  }

  // Find folders to download (exists in Firestore, but not locally)
  const foldersToDownload = firestoreFolderNames.filter(
    name => !localFolderNames.includes(name),
  );

  for (const folderName of foldersToDownload) {
    const zipBuffer = await receiveZipFromFirestore(folderName);
    if (zipBuffer) {
      const destinationPath = path.join(downloadedFoldersPath, folderName);
      await unzipToFolder(zipBuffer, destinationPath);
    }
  }

  console.log('Sync Process Complete');
}
