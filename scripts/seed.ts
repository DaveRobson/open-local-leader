
import admin from 'firebase-admin';

// Initialize the Firebase Admin SDK
const projectId = 'open-local-leaderboard';
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

admin.initializeApp({
  projectId,
});

const db = admin.firestore();

const seed = async () => {
  // Create Super Admin
  const superAdminUid = 'superadmin';
  await admin.auth().createUser({
    uid: superAdminUid,
    email: 'super@admin.com',
    password: 'password',
  });
  await db.collection('cf_leaderboard_athletes').doc(superAdminUid).set({
    name: 'Super Admin',
    division: 'Rx',
    gender: 'M',
    age: 40,
    gymId: 'GLOBAL',
    w1: 0,
    w2: 0,
    w3: 0,
    w1_verified: true,
    w2_verified: true,
    w3_verified: true,
    role: 'admin',
    superAdmin: true, // Set super admin flag here
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: superAdminUid,
  });
  console.log('Super admin created');

  // Create Gym
  const gymId = 'CF51';
  const gymAdminUid = 'gymadmin';
  await db.collection('gyms').doc(gymId).set({
    name: 'CrossFit 51',
    admins: [gymAdminUid],
  });
  console.log('Gym created');

  // Create Gym Admin
  await admin.auth().createUser({
    uid: gymAdminUid,
    email: 'admin@cf51.com',
    password: 'password',
  });
  await db.collection('cf_leaderboard_athletes').doc(gymAdminUid).set({
    name: 'Gym Admin',
    division: 'Rx',
    gender: 'M',
    age: 35,
    gymId,
    w1: 0,
    w2: 0,
    w3: 0,
    w1_verified: false,
    w2_verified: false,
    w3_verified: false,
    role: 'admin',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: gymAdminUid,
  });
  console.log('Gym admin created');

  // Create Athletes
  const athlete1Uid = 'athlete1';
  await admin.auth().createUser({
    uid: athlete1Uid,
    email: 'athlete1@cf51.com',
    password: 'password',
  });
  await db.collection('cf_leaderboard_athletes').doc(athlete1Uid).set({
    name: 'John Doe',
    division: 'Rx',
    gender: 'M',
    age: 30,
    gymId,
    w1: 120,
    w2: 225,
    w3: 0,
    w1_verified: true,
    w2_verified: false,
    w3_verified: false,
    role: 'member',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: athlete1Uid,
  });

  const athlete2Uid = 'athlete2';
  await admin.auth().createUser({
    uid: athlete2Uid,
    email: 'athlete2@cf51.com',
    password: 'password',
  });
  await db.collection('cf_leaderboard_athletes').doc(athlete2Uid).set({
    name: 'Jane Smith',
    division: 'Scaled',
    gender: 'F',
    age: 28,
    gymId,
    w1: 100,
    w2: 155,
    w3: 0,
    w1_verified: true,
    w2_verified: true,
    w3_verified: false,
    role: 'member',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: athlete2Uid,
  });
  console.log('Athletes created');

  console.log('Seed complete!');
  process.exit(0);
};

seed().catch(error => {
  console.error(error);
  process.exit(1);
});
