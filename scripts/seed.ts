
import admin from 'firebase-admin';
import { randomUUID } from 'crypto';

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
    w1: 100, // Score for super admin
    w2: 300,
    w3: 200,
    w1_verified: true,
    w2_verified: true,
    w3_verified: true,
    role: 'admin',
    superAdmin: true, // Set super admin flag here
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: superAdminUid,
  });
  console.log('Super admin created');

  // Create Gyms
  const cflondonGymId = 'CFLONDON';
  const cfreadingGymId = 'CFREADING';
  const gymAdminUid = 'gymadmin';
  const cfreadingAdminUid = 'cfreadingadmin';
  const charityTimestamp = admin.firestore.Timestamp.now();

  await db.collection('gyms').doc(cflondonGymId).set({
    name: 'CrossFit London',
    location: 'London, UK',
    admins: [gymAdminUid],
    charities: [
      {
        id: randomUUID(),
        name: 'British Red Cross',
        description: 'The British Red Cross helps people in crisis, whoever and wherever they are. We are part of a global voluntary network, responding to conflicts, natural disasters and individual emergencies.',
        websiteUrl: 'https://www.redcross.org.uk',
        logoUrl: 'https://www.redcross.org.uk/themes/custom/british_red_cross/logo.svg',
        addedAt: charityTimestamp,
        addedBy: gymAdminUid,
      },
      {
        id: randomUUID(),
        name: 'Help for Heroes',
        description: 'Help for Heroes supports those who have served in the British Armed Forces and have been wounded, injured or sick as a result of their service.',
        websiteUrl: 'https://www.helpforheroes.org.uk',
        logoUrl: '',
        addedAt: charityTimestamp,
        addedBy: gymAdminUid,
      },
      {
        id: randomUUID(),
        name: 'FareShare',
        description: 'FareShare is the UK\'s national network of charitable food redistributors, fighting hunger and food waste by redistributing surplus food to frontline charities and community groups.',
        websiteUrl: 'https://www.fareshare.org.uk',
        logoUrl: '',
        addedAt: charityTimestamp,
        addedBy: gymAdminUid,
      },
      {
        id: randomUUID(),
        name: 'Great Ormond Street Hospital Charity',
        description: 'Great Ormond Street Hospital Charity supports Great Ormond Street Hospital, helping to provide world-class care and pioneering new treatments and cures for childhood illnesses.',
        websiteUrl: 'https://www.gosh.org',
        logoUrl: '',
        addedAt: charityTimestamp,
        addedBy: gymAdminUid,
      },
      {
        id: randomUUID(),
        name: 'Local Youth Sports Foundation',
        description: 'Supporting youth athletics in our community through equipment donations, scholarships, and mentorship programs. Building strong kids through sports and character development.',
        websiteUrl: 'https://example.org/youth-sports',
        logoUrl: '',
        addedAt: charityTimestamp,
        addedBy: gymAdminUid,
      },
    ],
  });

  await db.collection('gyms').doc(cfreadingGymId).set({
    name: 'CrossFit Reading',
    location: 'Reading, UK',
    admins: [cfreadingAdminUid],
    charities: [],
  });
  console.log('Gyms created with charity partners');

  // Create Gym Admin for CFLONDON
  await admin.auth().createUser({
    uid: gymAdminUid,
    email: 'admin@cflondon.co.uk',
    password: 'password',
  });
  await db.collection('cf_leaderboard_athletes').doc(gymAdminUid).set({
    name: 'James Wilson',
    division: 'Rx',
    gender: 'M',
    age: 35,
    gymId: cflondonGymId,
    w1: 110,
    w2: 280,
    w3: 210,
    w1_verified: true,
    w2_verified: true,
    w3_verified: true,
    role: 'admin',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: gymAdminUid,
  });
  console.log('CFLONDON admin created');

  // Create Gym Admin for CFREADING
  await admin.auth().createUser({
    uid: cfreadingAdminUid,
    email: 'admin@cfreading.co.uk',
    password: 'password',
  });
  await db.collection('cf_leaderboard_athletes').doc(cfreadingAdminUid).set({
    name: 'Sarah Connor',
    division: 'Rx',
    gender: 'F',
    age: 38,
    gymId: cfreadingGymId,
    w1: 115,
    w2: 270,
    w3: 220,
    w1_verified: true,
    w2_verified: true,
    w3_verified: true,
    role: 'admin',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    createdBy: cfreadingAdminUid,
  });
  console.log('CFREADING admin created');

  // Create Athletes for CFLONDON
  const cflondonAthletes = [
    { uid: 'oliver.davies', email: 'oliver.davies@cflondon.co.uk', name: 'Oliver Davies', division: 'Rx', gender: 'M', age: 30, w1: 100, w2: 300, w3: 200 },
    { uid: 'ben.smith', email: 'ben.smith@cflondon.co.uk', name: 'Ben Smith', division: 'Rx', gender: 'M', age: 32, w1: 100, w2: 310, w3: 190 }, // Tied w1 with Oliver
    { uid: 'sarah.jones', email: 'sarah.jones@cflondon.co.uk', name: 'Sarah Jones', division: 'Rx', gender: 'F', age: 29, w1: 105, w2: 290, w3: 205 },
    { uid: 'laura.white', email: 'laura.white@cflondon.co.uk', name: 'Laura White', division: 'Rx', gender: 'F', age: 31, w1: 95, w2: 320, w3: 195 },
    { uid: 'emma.thompson', email: 'emma.thompson@cflondon.co.uk', name: 'Emma Thompson', division: 'Scaled', gender: 'F', age: 28, w1: 80, w2: 350, w3: 180 },
    { uid: 'tom.brown', email: 'tom.brown@cflondon.co.uk', name: 'Tom Brown', division: 'Scaled', gender: 'M', age: 27, w1: 85, w2: 340, w3: 185 },
    { uid: 'peter.green', email: 'peter.green@cflondon.co.uk', name: 'Peter Green', division: 'Foundations', gender: 'M', age: 45, w1: 60, w2: 400, w3: 150 },
    { uid: 'alice.blue', email: 'alice.blue@cflondon.co.uk', name: 'Alice Blue', division: 'Foundations', gender: 'F', age: 42, w1: 55, w2: 410, w3: 145 },
    { uid: 'missing.score', email: 'missing.score@cflondon.co.uk', name: 'Missing Score', division: 'Rx', gender: 'M', age: 25, w1: 100, w2: 0, w3: 0 }, // Missing w2, w3
  ];

  for (const data of cflondonAthletes) {
    await admin.auth().createUser({ uid: data.uid, email: data.email, password: 'password' });
    await db.collection('cf_leaderboard_athletes').doc(data.uid).set({
      name: data.name,
      division: data.division,
      gender: data.gender,
      age: data.age,
      gymId: cflondonGymId,
      w1: data.w1,
      w2: data.w2,
      w3: data.w3,
      w1_verified: true,
      w2_verified: data.w2 > 0, // Only verify if score exists
      w3_verified: data.w3 > 0, // Only verify if score exists
      role: 'member',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: data.uid,
    });
  }
  console.log('CFLONDON athletes created');

  // Create Athletes for CFREADING
  const cfreadingAthletes = [
    { uid: 'mark.johnson', email: 'mark.johnson@cfreading.co.uk', name: 'Mark Johnson', division: 'Rx', gender: 'M', age: 33, w1: 108, w2: 295, w3: 208 },
    { uid: 'chloe.davis', email: 'chloe.davis@cfreading.co.uk', name: 'Chloe Davis', division: 'Rx', gender: 'F', age: 26, w1: 112, w2: 285, w3: 212 },
    { uid: 'sam.white', email: 'sam.white@cfreading.co.uk', name: 'Sam White', division: 'Scaled', gender: 'M', age: 30, w1: 82, w2: 345, w3: 182 },
  ];

  for (const data of cfreadingAthletes) {
    await admin.auth().createUser({ uid: data.uid, email: data.email, password: 'password' });
    await db.collection('cf_leaderboard_athletes').doc(data.uid).set({
      name: data.name,
      division: data.division,
      gender: data.gender,
      age: data.age,
      gymId: cfreadingGymId,
      w1: data.w1,
      w2: data.w2,
      w3: data.w3,
      w1_verified: true,
      w2_verified: true,
      w3_verified: true,
      role: 'member',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: data.uid,
    });
  }
  console.log('CFREADING athletes created');

  // Create workout configurations
  await db.collection('workouts').doc('current').set({
    w1: { id: 'w1', name: '26.1 (Reps)', scoreType: 'reps', unit: 'reps', published: true, hasTiebreaker: false },
    w2: { id: 'w2', name: '26.2 (Time)', scoreType: 'time', unit: 'seconds', published: true, hasTiebreaker: false },
    w3: { id: 'w3', name: '26.3 (CAP+Reps)', scoreType: 'time_cap_reps', timeCap: 900, unit: 'reps', published: true, hasTiebreaker: true },
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
      context: { athleteId: cflondonAthletes[0].uid },
      url: 'http://localhost:5173/?gymId=CFLONDON',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      userId: cflondonAthletes[0].uid,
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
      context: { email: 'james.brown@gmail.co.uk' },
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
      context: { athleteId: cflondonAthletes[1].uid, workout: 'w1' },
      url: 'http://localhost:5173/?gymId=CFLONDON',
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
      context: { filterGym: 'CFLONDON' },
      url: 'http://localhost:5173/?gymId=CFLONDON',
      userAgent: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36',
      userId: cflondonAthletes[1].uid,
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
      url: 'http://localhost:5173/?gymId=CFLONDON',
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      userId: cflondonAthletes[0].uid,
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
      context: { email: 'existing.user@example.co.uk' },
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
      context: { email: 'newbie@crossfit.co.uk' },
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
      context: { athleteId: cflondonAthletes[0].uid, gymId: cflondonGymId },
      url: 'http://localhost:5173/?gymId=CFLONDON',
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
