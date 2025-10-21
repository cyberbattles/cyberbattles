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
 * Triggered when a team document is updated in Firestore.
 * Recalculates and updates the total score for the clan that the team belongs to,
 * based on the SLA-adjusted scores of all member teams.
 */
exports.updateClanScoreOnTeamUpdate = functions.firestore
  .document('teams/{teamId}')
  .onUpdate(async (change, context) => {
    const teamDataBefore = change.before.data();
    const teamDataAfter = change.after.data();
    const teamId = context.params.teamId;

    // --- Step 2: Check for Relevant Changes ---
    // Exit if score and SLA fields haven't changed
    if (
      teamDataAfter.totalScore === teamDataBefore.totalScore &&
      teamDataAfter.downCount === teamDataBefore.downCount &&
      teamDataAfter.totalCount === teamDataBefore.totalCount
    ) {
      console.log(
        `Team ${teamId}: No relevant score/SLA fields changed. Exiting.`,
      );
      return null;
    }

    console.log(
      `Team ${teamId}: Relevant change detected. Recalculating clan score.`,
    );

    // --- Step 3: Identify Team Leader ---
    // Team leader is the first member ID
    if (!teamDataAfter.memberIds || teamDataAfter.memberIds.length === 0) {
      console.log(`Team ${teamId} has no members. Cannot find clan.`);
      return null;
    }
    const teamLeaderId = teamDataAfter.memberIds[0];

    const db = admin.firestore();

    try {
      // --- Step 4: Find the Clan ---
      const clansRef = db.collection('clans');
      const clanQuery = clansRef
        .where('memberIds', 'array-contains', teamLeaderId)
        .limit(1);
      const clanSnapshot = await clanQuery.get();

      if (clanSnapshot.empty) {
        console.log(
          `Team leader ${teamLeaderId} (from team ${teamId}) not found in any clan.`,
        );
        return null; // Team leader isn't in a clan
      }

      const clanDoc = clanSnapshot.docs[0];
      const clanId = clanDoc.id;
      const clanData = clanDoc.data();
      const clanMemberLeaderIds = clanData.memberIds || [];

      console.log(
        `Found clan ${clanId} for team leader ${teamLeaderId} (from team ${teamId}).`,
      );

      if (clanMemberLeaderIds.length === 0) {
        console.log(`Clan ${clanId} has no members. Setting score to 0.`);
        await db.collection('clans').doc(clanId).update({totalScore: 0});
        return null;
      }

      // --- Step 5 & 6: Fetch Member Teams & Calculate Adjusted Scores ---
      const teamsRef = db.collection('teams');
      let totalClanScore = 0;

      // Create promises to fetch all teams whose leader is in the clan
      const teamFetchPromises = clanMemberLeaderIds.map(async leaderId => {
        const teamQuery = teamsRef
          .where('memberIds', 'array-contains', leaderId)
          .limit(1); // Assuming leader is unique across teams for safety
        const teamSnapshot = await teamQuery.get();

        if (!teamSnapshot.empty) {
          const memberTeamDoc = teamSnapshot.docs[0];
          // Ensure the leader we queried for is actually the *first* member
          if (memberTeamDoc.data().memberIds[0] === leaderId) {
            return memberTeamDoc.data(); // Return the team data
          }
        }
        console.warn(
          `Could not find team for leader ID: ${leaderId} or they are not the leader.`,
        );
        return null; // Return null if team not found or ID doesn't match leader position
      });

      // Wait for all team fetches
      const memberTeamsData = await Promise.all(teamFetchPromises);

      // --- Step 7: Sum Scores ---
      memberTeamsData.forEach(teamData => {
        if (teamData) {
          // Check if team data was successfully fetched
          const {totalScore = 0, downCount = 0, totalCount = 0} = teamData;
          let slaMultiplier = 1;
          if (totalCount > 0) {
            slaMultiplier = 1 - downCount / totalCount;
          }
          // Ensure multiplier isn't negative if downCount somehow exceeds totalCount
          slaMultiplier = Math.max(0, slaMultiplier);

          const adjustedScore = totalScore * slaMultiplier;
          totalClanScore += adjustedScore;
          console.log(
            `Team ${teamData.id}: Score=${totalScore}, Down=${downCount}, Total=${totalCount}, Multiplier=${slaMultiplier.toFixed(3)}, AdjScore=${adjustedScore.toFixed(2)}`,
          );
        }
      });
      // Round the final score to avoid potential floating point inaccuracies
      const finalClanScore = Math.round(totalClanScore);

      console.log(
        `Clan ${clanId}: Calculated total adjusted score: ${finalClanScore}`,
      );

      // --- Update Clan Document ---
      await db.collection('clans').doc(clanId).update({
        totalScore: finalClanScore,
      });

      console.log(
        `Successfully updated clan ${clanId} score to ${finalClanScore}.`,
      );
      return null;
    } catch (error) {
      console.error(
        `Error updating score for clan containing team ${teamId}:`,
        error,
      );
      // Optional: Add more specific error handling/reporting
      return null;
    }
  });
