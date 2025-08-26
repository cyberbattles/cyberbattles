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
