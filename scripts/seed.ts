
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
    w1_verified: false,
    w2_verified: false,
    w3_verified: false,
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
    w1: 0,
    w2: 0,
    w3: 0,
    w1_verified: false,
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
    w1: 0,
    w2: 0,
    w3: 0,
    w1_verified: false,
    w2_verified: false,
    w3_verified: false,
    role: 'member',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: athlete2Uid,
  });
  console.log('Athletes created');

  // Create workout configurations
  await db.collection('workouts').doc('current').set({
    w1: { id: 'w1', name: '26.1', scoreType: 'reps', unit: 'reps', published: false },
    w2: { id: 'w2', name: '26.2', scoreType: 'reps', unit: 'reps', published: false },
    w3: { id: 'w3', name: '26.3', scoreType: 'reps', unit: 'reps', published: false },
  });
  console.log('Workout configurations created');

  // Create error logs seed data
  const now = new Date();
  const errorLogs = [
    {
      level: 'error',
      message: 'Error updating score',
      error: {
        name: 'FirebaseError',
        message: 'Missing or insufficient permissions.',
        code: 'permission-denied',
      },
      context: { athleteId: athlete1Uid },
      url: 'http://localhost:5173/?gymId=CF51',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      userId: athlete1Uid,
      timestamp: new Date(now.getTime() - 5 * 60 * 1000), // 5 minutes ago
    },
    {
      level: 'error',
      message: 'Email signin failed',
      error: {
        name: 'FirebaseError',
        message: 'Firebase: Error (auth/wrong-password).',
        code: 'auth/wrong-password',
      },
      context: { email: 'john.smith@gmail.com' },
      url: 'http://localhost:5173/',
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      userId: null, // Anonymous user trying to log in
      timestamp: new Date(now.getTime() - 15 * 60 * 1000), // 15 minutes ago
    },
    {
      level: 'error',
      message: 'Google sign-in failed',
      error: {
        name: 'FirebaseError',
        message: 'Firebase: Error (auth/popup-closed-by-user).',
        code: 'auth/popup-closed-by-user',
      },
      context: null,
      url: 'http://localhost:5173/',
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      userId: null,
      timestamp: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
    },
    {
      level: 'error',
      message: 'Error verifying score',
      error: {
        name: 'FirebaseError',
        message: 'Missing or insufficient permissions.',
        code: 'permission-denied',
      },
      context: { athleteId: athlete2Uid, workout: 'w1' },
      url: 'http://localhost:5173/?gymId=CF51',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      userId: gymAdminUid,
      timestamp: new Date(now.getTime() - 1 * 60 * 60 * 1000), // 1 hour ago
    },
    {
      level: 'warn',
      message: 'Workout config not found! Falling back to default (all workouts unpublished). Create a "current" document in the "workouts" collection in Firestore.',
      error: null,
      context: null,
      url: 'http://localhost:5173/',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      userId: superAdminUid,
      timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
    {
      level: 'error',
      message: 'Error fetching athletes',
      error: {
        name: 'FirebaseError',
        message: 'Failed to get document because the client is offline.',
        code: 'unavailable',
      },
      context: { filterGym: 'CF51' },
      url: 'http://localhost:5173/?gymId=CF51',
      userAgent: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36',
      userId: athlete2Uid,
      timestamp: new Date(now.getTime() - 3 * 60 * 60 * 1000), // 3 hours ago
    },
    {
      level: 'error',
      message: 'React render error',
      error: {
        name: 'TypeError',
        message: "Cannot read properties of undefined (reading 'name')",
        stack: `TypeError: Cannot read properties of undefined (reading 'name')
    at LeaderboardRow (http://localhost:5173/src/App.tsx:456:23)
    at renderWithHooks (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js:1234:22)
    at mountIndeterminateComponent (http://localhost:5173/node_modules/.vite/deps/react-dom_client.js:5678:17)`,
      },
      context: { componentStack: '\n    at LeaderboardRow\n    at div\n    at main\n    at App' },
      url: 'http://localhost:5173/?gymId=CF51',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      userId: athlete1Uid,
      timestamp: new Date(now.getTime() - 6 * 60 * 60 * 1000), // 6 hours ago
    },
    {
      level: 'error',
      message: 'Error creating gym',
      error: {
        name: 'FirebaseError',
        message: 'Quota exceeded.',
        code: 'resource-exhausted',
      },
      context: { gymName: 'New Gym', gymId: 'NEW-GYM' },
      url: 'http://localhost:5173/',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      userId: gymAdminUid,
      timestamp: new Date(now.getTime() - 12 * 60 * 60 * 1000), // 12 hours ago
    },
    {
      level: 'error',
      message: 'Email signup failed',
      error: {
        name: 'FirebaseError',
        message: 'Firebase: Error (auth/email-already-in-use).',
        code: 'auth/email-already-in-use',
      },
      context: { email: 'existing.user@example.com' },
      url: 'http://localhost:5173/',
      userAgent: 'Mozilla/5.0 (iPad; CPU OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
      userId: null,
      timestamp: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
    },
    {
      level: 'error',
      message: 'Email signup failed',
      error: {
        name: 'FirebaseError',
        message: 'Firebase: Password should be at least 6 characters (auth/weak-password).',
        code: 'auth/weak-password',
      },
      context: { email: 'newbie@crossfit.com' },
      url: 'http://localhost:5173/',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      userId: null,
      timestamp: new Date(now.getTime() - 4 * 60 * 60 * 1000), // 4 hours ago
    },
    {
      level: 'error',
      message: 'Error toggling admin status',
      error: {
        name: 'FirebaseError',
        message: 'Missing or insufficient permissions.',
        code: 'permission-denied',
      },
      context: { athleteId: athlete1Uid, gymId: gymId },
      url: 'http://localhost:5173/?gymId=CF51',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      userId: superAdminUid,
      timestamp: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    },
  ];

  for (const log of errorLogs) {
    await db.collection('error_logs').add(log);
  }
  console.log(`Error logs created (${errorLogs.length} entries)`);

  console.log('Seed complete!');
  process.exit(0);
};

seed().catch(error => {
  console.error(error);
  process.exit(1);
});
