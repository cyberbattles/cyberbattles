import * as fs from 'fs/promises';
import * as path from 'path';
import * as admin from 'firebase-admin';

import JSZip = require('jszip');

import {scenariosCollection} from './firebase';
import {generateId} from '../helpers';

// This file was vibe coded, courtesy of Gemini 2.5 Pro.
// I don't like trying to read Firebase docs.
// It has been edited, reviewed and tested by @smp46.

/**
 * Parses a metadata.csv file from a given folder path.
 * If a scenario_id is not found, it generates one and writes it back to the file.
 * @param folderPath The path to the folder containing the metadata.csv.
 * @returns A Promise that resolves with a structured metadata object.
 */
async function parseMetadata(
  folderPath: string,
): Promise<Record<string, string>> {
  const metadataPath = path.join(folderPath, 'metadata.csv');
  const metadata: Record<string, string> = {};

  try {
    const fileContent = await fs.readFile(metadataPath, 'utf-8');
    const lines = fileContent.split('\n');
    for (const line of lines) {
      if (line.trim() === '') continue; // Skip empty lines
      const [key, ...valueParts] = line.split(',');
      if (key && valueParts.length > 0) {
        metadata[key.trim()] = valueParts.join(',').trim();
      }
    }
  } catch (_) {}

  // If no scenario_id exists in the metadata, generate and persist one.
  if (!metadata.scenario_id) {
    const newId = generateId();
    metadata.scenario_id = newId;

    const newEntry = `\nscenario_id,${newId}`;

    await fs.appendFile(metadataPath, newEntry, 'utf-8');
  }

  return metadata;
}

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
 * Sends a zipped scenario and its metadata to Firestore.
 * The document ID will be the scenario_id from the metadata.
 * @param metadata The parsed metadata object.
 * @param zipBuffer The zip data as a Buffer.
 */
async function uploadScenarioToFirestore(
  metadata: Record<string, string>,
  zipBuffer: Buffer,
): Promise<void> {
  if (!metadata.scenario_id) {
    throw new Error(
      'Cannot upload scenario without a scenario_id in metadata.',
    );
  }

  const base64Data = zipBuffer.toString('base64');

  const docData = {
    ...metadata, // Insert metadata fields into the document
    zipData: base64Data,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  };

  await scenariosCollection.doc(metadata.scenario_id).set(docData);
  console.log(
    `Sent ${metadata.folderName} (ID: ${metadata.scenario_id}) to Firestore.`,
  );
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

  console.log(`Received ${folderId} from Firestore.`);
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
 * The main sync function that renames local folders to match their scenario_id,
 * then syncs with Firestore.
 * @param localFoldersPath The parent directory containing all folders to be synced.
 */
export async function syncFolders(localFoldersPath: string) {
  console.log('Starting Sync Process');

  // Pre-sync local folder renaming
  let localDirents = await fs.readdir(localFoldersPath, {withFileTypes: true});
  let localFolders = localDirents.filter(dirent => dirent.isDirectory());

  for (const folder of localFolders) {
    const originalPath = path.join(localFoldersPath, folder.name);
    const metadata = await parseMetadata(originalPath);
    const targetName = metadata.scenario_id;

    if (folder.name !== targetName) {
      const newPath = path.join(localFoldersPath, targetName);
      console.log(`Renaming local folder: "${folder.name}" -> "${targetName}"`);
      await fs.rename(originalPath, newPath);
    }
  }

  // Re-read directories now that renames are complete
  localDirents = await fs.readdir(localFoldersPath, {withFileTypes: true});
  localFolders = localDirents.filter(dirent => dirent.isDirectory());

  const localScenarios = new Map<
    string,
    {path: string; metadata: Record<string, string>}
  >();

  for (const folder of localFolders) {
    const folderPath = path.join(localFoldersPath, folder.name);
    // The folder name and scenario_id should now match
    const metadata = await parseMetadata(folderPath);
    localScenarios.set(metadata.scenario_id, {path: folderPath, metadata});
  }

  // Get list of scenario IDs from Firestore
  const localScenarioIds = Array.from(localScenarios.keys());

  const snapshot = await scenariosCollection.get();
  const firestoreScenarioIds = snapshot.docs.map(doc => doc.id);

  // Find scenarios to upload (exist locally, but not in Firestore)
  const scenariosToUpload = localScenarioIds.filter(
    id => !firestoreScenarioIds.includes(id),
  );

  for (const scenarioId of scenariosToUpload) {
    const scenario = localScenarios.get(scenarioId);
    if (scenario) {
      const zipBuffer = await zipFolder(scenario.path);
      await uploadScenarioToFirestore(scenario.metadata, zipBuffer);
    }
  }

  // Find scenarios to download (exist in Firestore, but not locally)
  const scenariosToDownload = firestoreScenarioIds.filter(
    (id: string) => !localScenarioIds.includes(id),
  );

  for (const scenarioId of scenariosToDownload) {
    const zipBuffer = await receiveZipFromFirestore(scenarioId);

    if (zipBuffer) {
      const destinationPath = path.join(localFoldersPath, scenarioId);
      await unzipToFolder(zipBuffer, destinationPath);
    } else {
      console.warn(`Could not download ${scenarioId}, zip data is missing.`);
    }
  }

  console.log('Sync Process Complete');
}
