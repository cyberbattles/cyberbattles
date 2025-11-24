const functions = require('firebase-functions');

const admin = require('firebase-admin');
admin.initializeApp();

/**
 * Triggered when a new user is created in Firebase Authentication.
 * This function creates a corresponding user document in the 'login' collection in Firestore.
 */
exports.syncUserToFirestore = functions.auth.user().onCreate(user => {
  const {uid, email, displayName} = user;

  const userDocRef = admin.firestore().collection('login').doc(uid);

  const userName = displayName || email.split('@')[0];

  const userData = {
    UID: uid,
    email: email,
    teamId: '',
    userName: userName,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  return userDocRef
    .set(userData)
    .then(() => {
      console.log(
        `Successfully created user document for UID: ${uid} with userName: ${userName}`,
      );
      return null;
    })
    .catch(error => {
      console.error(`Error creating user document for UID: ${uid}`, error);
      return null;
    });
});

/**
 * Triggered when a user is deleted from Firebase Authentication.
 * This function deletes the corresponding user document from the 'login' collection in Firestore.
 */
exports.deleteUserFromFirestore = functions.auth.user().onDelete(user => {
  // Get the UID of the deleted user.
  const {uid} = user;

  // Get a reference to the document to be deleted.
  const userDocRef = admin.firestore().collection('login').doc(uid);

  // Delete the document.
  return userDocRef
    .delete()
    .then(() => {
      console.log(`Successfully deleted user document for UID: ${uid}`);
      return null;
    })
    .catch(error => {
      console.error(`Error deleting user document for UID: ${uid}`, error);
      return null;
    });
});

/**
 * Triggered when a new finished session document is created.
 * Aggregates scores from the session results and updates the totalScore
 * for each associated clan using atomic increments.
 */
exports.aggregateClanScores = functions.firestore
  .document('finishedSessions/{sessionId}')
  .onCreate(async (snap, context) => {
    const sessionData = snap.data();
    const sessionId = context.params.sessionId;
    const results = sessionData.results;

    if (
      !results ||
      typeof results !== 'object' ||
      Object.keys(results).length === 0
    ) {
      return null;
    }

    const db = admin.firestore();
    const clanScoresToAdd = {};

    // Aggregate New Scores from this session
    for (const teamId in results) {
      if (Object.prototype.hasOwnProperty.call(results, teamId)) {
        const scoreEntry = results[teamId];
        // Ensure the entry is an array with at least 3 elements
        if (Array.isArray(scoreEntry) && scoreEntry.length >= 3) {
          const teamScore = scoreEntry[1];
          const clanId = scoreEntry[2];

          // Validate data types
          if (
            typeof teamScore === 'number' &&
            typeof clanId === 'string' &&
            clanId.trim() !== ''
          ) {
            clanScoresToAdd[clanId] =
              (clanScoresToAdd[clanId] || 0) + teamScore;
            console.log(
              ` - Team ${teamId}: Score ${teamScore}, Clan ${clanId}`,
            );
          } else {
            console.warn(
              `Skipping invalid score entry for team ${teamId} in session ${sessionId}. Entry:`,
              scoreEntry,
            );
          }
        } else {
          console.warn(
            `Skipping malformed score entry for team ${teamId} in session ${sessionId}. Entry:`,
            scoreEntry,
          );
        }
      }
    }

    if (Object.keys(clanScoresToAdd).length === 0) {
      console.log(
        `No valid clan scores found in session ${sessionId}. Exiting.`,
      );
      return null;
    }

    // Update Clan Totals Atomically
    const updatePromises = [];
    for (const clanId in clanScoresToAdd) {
      if (Object.prototype.hasOwnProperty.call(clanScoresToAdd, clanId)) {
        const scoreToAdd = clanScoresToAdd[clanId];
        const clanDocRef = db.collection('clans').doc(clanId);

        // Use FieldValue.increment for atomic addition
        const updatePromise = clanDocRef
          .update({
            totalScore: admin.firestore.FieldValue.increment(scoreToAdd),
          })
          .catch(error => {
            console.error(
              `Failed to update score for clan ${clanId}. Error:`,
              error,
            );
          });

        updatePromises.push(updatePromise);
      }
    }

    try {
      await Promise.all(updatePromises);
      console.log(
        `Successfully processed score updates for session ${sessionId}.`,
      );
    } catch (error) {
      console.error(
        `Error during batch update for session ${sessionId}:`,
        error,
      );
    }

    return null;
  });
