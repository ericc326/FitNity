import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { onDocumentUpdated } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";

admin.initializeApp();

const db = admin.firestore();
const storage = admin.storage().bucket();

/**
 * Delete documents matching a field == uid in batches (safe for large collections)
 */
async function deleteDocsMatching(
  collectionPath: string,
  field: string,
  uid: string
) {
  const batchSize = 500;
  while (true) {
    const q = db
      .collection(collectionPath)
      .where(field, "==", uid)
      .limit(batchSize);
    const snap = await q.get();
    if (snap.empty) return;
    // process documents in parallel but limit concurrency if needed
    await Promise.all(
      snap.docs.map(async (docSnap) => {
        try {
          // recursiveDelete will remove subcollections as well
          await admin.firestore().recursiveDelete(docSnap.ref);
          console.log(
            `recursiveDelete succeeded for ${collectionPath}/${docSnap.id}`
          );
        } catch (err) {
          console.warn(
            `recursiveDelete failed for ${collectionPath}/${docSnap.id}, falling back to delete:`,
            err
          );
          try {
            await docSnap.ref.delete();
            console.log(
              `Deleted ${collectionPath}/${docSnap.id} (single delete fallback)`
            );
          } catch (err2) {
            console.error(
              `Failed to delete ${collectionPath}/${docSnap.id}:`,
              err2
            );
          }
        }
      })
    );
    if (snap.size < batchSize) break;
  }
}

/**
 * Delete docs in a collectionGroup where document id == docId (useful for participant subcollections)
 */
async function deleteDocsInCollectionGroupByDocId(
  subcollectionName: string,
  docId: string
) {
  const batchSize = 500;
  let lastDoc: admin.firestore.QueryDocumentSnapshot | null = null;

  while (true) {
    let q = db.collectionGroup(subcollectionName).limit(batchSize);
    if (lastDoc) q = q.startAfter(lastDoc);

    const snap = await q.get();
    if (snap.empty) return;

    // collect only documents whose document id equals the target docId
    const batch = db.batch();
    let any = false;
    snap.docs.forEach((d) => {
      if (d.id === docId) {
        batch.delete(d.ref);
        any = true;
      }
    });

    if (any) {
      await batch.commit();
      console.log(
        `Deleted ${subcollectionName} documents with id=${docId} (batch)`
      );
    }

    if (snap.size < batchSize) break;
    lastDoc = snap.docs[snap.docs.length - 1];
  }
}

// helper: delete a storage file given a Firebase download URL
async function deleteStorageFileByUrlOrPath(pathOrUrl?: string) {
  if (!pathOrUrl) return;
  console.log("deleteStorageFileByUrlOrPath called with:", pathOrUrl);
  const oIndex = pathOrUrl.indexOf("/o/");
  if (oIndex === -1) {
    console.warn("URL does not contain '/o/'; skipping deletion:", pathOrUrl);
    return;
  }
  const afterO = pathOrUrl.substring(oIndex + 3);
  const encodedPath = afterO.split(/[?#]/)[0];
  const filePath = decodeURIComponent(encodedPath).replace(/^\/+/, "");
  console.log("Resolved filePath to delete:", filePath);
  // delete using admin SDK, let errors surface
  await storage.file(filePath).delete();
  console.log("Deleted storage file:", filePath);
}

// HTTP endpoint that accepts Bearer <idToken> and verifies it server-side.
// Use POST and include Authorization: Bearer <idToken> header and body { } (body is ignored).

export const deleteUserAndData = functions.https.onRequest(async (req, res) => {
  try {
    // Only allow POST
    if (req.method !== "POST") {
      res.status(405).json({
        error: { code: "method-not-allowed", message: "Method not allowed" },
      });
      return;
    }

    const authHeader = (req.headers.authorization ||
      req.headers.Authorization) as string | undefined;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.warn("deleteUserAndData: missing Authorization header");
      res.status(401).json({
        error: { code: "unauthenticated", message: "Must be signed in" },
      });
      return;
    }

    const idToken = authHeader.split("Bearer ")[1];
    let decoded: admin.auth.DecodedIdToken;
    try {
      decoded = await admin.auth().verifyIdToken(idToken);
    } catch (err) {
      console.warn("deleteUserAndData: verifyIdToken failed:", err);
      res.status(401).json({
        error: { code: "unauthenticated", message: "Must be signed in" },
      });
      return;
    }

    const uid = decoded.uid;
    console.log("deleteUserAndData: verified uid =", uid);

    try {
      // 1) Profile image on users/{uid}
      try {
        const userDoc = await db.collection("users").doc(uid).get();
        if (userDoc.exists) {
          const u = userDoc.data() as any;
          const profileImg =
            u?.photoURL || u?.avatar || u?.image || u?.profileImage || u?.photo;
          if (profileImg) {
            console.log("Deleting profile image for user:", uid, profileImg);
            await deleteStorageFileByUrlOrPath(String(profileImg));
          }
        }
      } catch (e) {
        console.warn("Failed to delete profile image for user", uid, e);
      }
      // 2) Delete user's Firestore doc and its nested subcollections (recursive)
      try {
        await admin
          .firestore()
          .recursiveDelete(db.collection("users").doc(uid));
        console.log(`recursiveDelete succeeded for users/${uid}`);
      } catch (e) {
        console.warn(
          "recursiveDelete failed, falling back to single delete:",
          e
        );
        try {
          await db.collection("users").doc(uid).delete();
          console.log(`Deleted users/${uid} (single delete)`);
        } catch (err2) {
          console.error("fallback delete users/{uid} failed:", err2);
        }
      }

      // 3) Delete images referenced in profile, posts and challenges (run before Firestore deletion) ---
      try {
        // 3a) Top-level collections to scan
        const collectionsToScan: {
          name: string;
          field: string;
          uidField: string;
        }[] = [
          { name: "posts", field: "imageUrl", uidField: "userId" },
          { name: "challenges", field: "imageUrl", uidField: "createdBy" },
        ];

        for (const colMeta of collectionsToScan) {
          try {
            const q = db
              .collection(colMeta.name)
              .where(colMeta.uidField, "==", uid)
              .limit(1000);
            const snap = await q.get();
            console.log(
              `Found ${snap.size} docs in ${colMeta.name} for user ${uid}`
            );
            if (snap.empty) continue;
            await Promise.all(
              snap.docs.map(async (docSnap) => {
                const data = docSnap.data() as any;
                const imageUrl = data?.[colMeta.field]
                  ? String(data[colMeta.field])
                  : undefined;
                if (imageUrl) {
                  try {
                    console.log(
                      `Deleting image for ${colMeta.name}/${docSnap.id}:`,
                      imageUrl
                    );
                    await deleteStorageFileByUrlOrPath(imageUrl);
                  } catch (e) {
                    console.error(
                      `Failed deleting image for ${colMeta.name}/${docSnap.id}:`,
                      e
                    );
                  }
                }
              })
            );
          } catch (e) {
            console.warn(
              `Error scanning collection ${colMeta.name} for images:`,
              e
            );
          }
        }
      } catch (e) {
        console.warn("Error deleting user images:", e);
      }

      // 4) Delete related top-level collections documents created by this user
      const collectionsToTry = [
        "posts",
        "challenges",
      ];
      for (const col of collectionsToTry) {
        try {
          await deleteDocsMatching(col, "uid", uid);
        } catch (e) {
          console.warn(`deleteDocsMatching(${col}, uid) failed:`, e);
        }
        try {
          await deleteDocsMatching(col, "userId", uid);
        } catch (e) {
          console.warn(`deleteDocsMatching(${col}, userId) failed:`, e);
        }
        try {
          await deleteDocsMatching(col, "createdBy", uid);
        } catch (e) {
          // ignore
        }
      }

      // 4a) Delete participant documents in nested subcollections where doc id == uid (e.g., challenges/{id}/participants/{uid})
      try {
        await deleteDocsInCollectionGroupByDocId("participants", uid);
      } catch (e) {
        console.warn(
          "deleteDocsInCollectionGroupByDocId(participants) failed:",
          e
        );
      }

      // 4b) Remove the uid from parent challenge documents' participants array
      try {
        const batchSize = 500;
        while (true) {
          const q = db
            .collection("challenges")
            .where("participants", "array-contains", uid)
            .limit(batchSize);
          const snap = await q.get();
          if (snap.empty) break;

          // Process each challenge with a transaction to ensure atomic update
          await Promise.all(
            snap.docs.map(async (d) => {
              try {
                await db.runTransaction(async (tx) => {
                  const doc = await tx.get(d.ref);
                  if (!doc.exists) return;
                  const data = doc.data() as any;
                  const participants: string[] = Array.isArray(
                    data?.participants
                  )
                    ? data.participants
                    : [];
                  if (!participants.includes(uid)) return; // nothing to do

                  // Compute new participantCount (fallback to participants.length if missing)
                  const currentCount =
                    typeof data?.participantCount === "number"
                      ? data.participantCount
                      : participants.length;
                  const newCount = Math.max(0, currentCount - 1);

                  tx.update(d.ref, {
                    participants: admin.firestore.FieldValue.arrayRemove(uid),
                    participantCount: newCount,
                  });
                });
                console.log(
                  `Removed participant ${uid} from challenge ${d.id}`
                );
              } catch (err) {
                console.warn(
                  `Failed to update challenge ${d.id} to remove participant ${uid}:`,
                  err
                );
              }
            })
          );

          if (snap.size < batchSize) break;
        }
      } catch (e) {
        console.warn(
          "Failed removing uid from challenge documents' participants:",
          e
        );
      }
      // 5) Delete Auth user (admin)
      try {
        await admin.auth().deleteUser(uid);
        console.log(`Deleted auth user ${uid}`);
      } catch (e) {
        console.error("Failed to delete auth user:", e);
      }
    } catch (err) {
      console.error("deleteUserAndData deletion error:", err);
      res.status(500).json({
        error: {
          code: "internal",
          message: "Failed to delete user and data",
        },
      });
      return;
    }

    res.status(200).json({ success: true });
    return;
  } catch (err) {
    console.error("deleteUserAndData unexpected error:", err);
    res.status(500).json({ error: { code: "internal", message: String(err) } });
    return;
  }
});

// Propagate user name changes to denormalized documents (e.g. posts.userName)
export const propagateUserName = onDocumentUpdated(
  "users/{uid}",
  async (event) => {
    const uid = String(event.params.uid);
    const beforeSnap = event.data?.before;
    const afterSnap = event.data?.after;

    const before = beforeSnap ? beforeSnap.data() : undefined;
    const after = afterSnap ? afterSnap.data() : undefined;

    const oldName = before?.name ?? before?.displayName;
    const newName = after?.name ?? after?.displayName;

    if (!newName || newName === oldName) {
      logger.info(`No name change for uid=${uid}`);
      return;
    }

    logger.info(
      `propagateUserName: uid=${uid} name changed: "${oldName}" -> "${newName}"`
    );

    try {
      // Helper to update a top-level collection where documents have userId field
      async function updateCollectionUserName(
        collectionName: string,
        userIdField = "userId",
        targetField = "userName"
      ) {
        const qSnap = await db
          .collection(collectionName)
          .where(userIdField, "==", uid)
          .get();
        if (qSnap.empty) return;
        const docs = qSnap.docs;
        const batches: admin.firestore.WriteBatch[] = [];
        let batch = db.batch();
        let opCount = 0;

        for (const d of docs) {
          batch.update(d.ref, { [targetField]: newName });
          opCount++;
          if (opCount === 500) {
            batches.push(batch);
            batch = db.batch();
            opCount = 0;
          }
        }
        if (opCount > 0) batches.push(batch);

        await Promise.all(batches.map((b) => b.commit()));
        logger.info(
          `Updated ${docs.length} documents in ${collectionName} for uid=${uid}`
        );
      }

      async function updateCollectionGroupUserName(
        subcollectionName: string,
        userIdField = "userId",
        targetField = "userName"
      ) {
        const pageSize = 500;
        let lastDoc: admin.firestore.QueryDocumentSnapshot | null = null;
        let totalUpdated = 0;

        logger.info(
          `Scanning collectionGroup(${subcollectionName}) pages to update ${targetField} for uid=${uid}`
        );

        while (true) {
          let q = db.collectionGroup(subcollectionName).limit(pageSize);
          if (lastDoc) q = q.startAfter(lastDoc);

          const snap = await q.get();
          logger.info(
            `collectionGroup page returned ${snap.size} docs for ${subcollectionName}`
          );
          if (snap.empty) break;

          let batch = db.batch();
          let ops = 0;

          for (const docSnap of snap.docs) {
            try {
              const data = docSnap.data() as any;
              // only check the configured userIdField == uid
              const isMatch =
                data &&
                Object.prototype.hasOwnProperty.call(data, userIdField) &&
                String(data[userIdField]) === String(uid);

              if (!isMatch) continue;

              batch.update(docSnap.ref, { [targetField]: newName });
              ops++;
              if (ops === 500) {
                await batch.commit();
                totalUpdated += ops;
                batch = db.batch();
                ops = 0;
              }
            } catch (e) {
              logger.error(
                `Failed preparing update for ${docSnap.ref.path}:`,
                e
              );
            }
          }

          if (ops > 0) {
            await batch.commit();
            totalUpdated += ops;
          }

          lastDoc = snap.docs[snap.docs.length - 1];
          if (snap.size < pageSize) break;
        }

        logger.info(
          `collectionGroup(${subcollectionName}) update finished, totalUpdated=${totalUpdated}`
        );
      }

      // Update posts
      await updateCollectionUserName("posts", "userId", "userName");

      // Optionally update other collections that denormalize user name:
      // await updateCollectionUserName("comments", "userId", "userName");
      // await updateCollectionUserName("challenges", "createdBy", "creatorName");

      // Update comments inside posts/{postId}/comments and any other comments subcollections
      await updateCollectionGroupUserName("comments", "userId", "userName");
      await updateCollectionGroupUserName("schedules", "userId", "userName");

      return;
    } catch (err) {
      logger.error("propagateUserName error:", err);
      return;
    }
  }
);
