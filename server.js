const express = require('express');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Database state
let useMockDb = false;
let db = null;
let mockScores = [
  { nickname: "Antigravity", score: 9999, level: 3, timestamp: Date.now() },
  { nickname: "PlayerOne", score: 5000, level: 2, timestamp: Date.now() - 3600000 },
  { nickname: "ClassicGamer", score: 2500, level: 1, timestamp: Date.now() - 7200000 }
];

// Initialize Firebase Admin
try {
  let serviceAccount = null;
  const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

  if (fs.existsSync(serviceAccountPath)) {
    console.log("Found serviceAccountKey.json, using local file credentials.");
    serviceAccount = require(serviceAccountPath);
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    console.log("Found FIREBASE_SERVICE_ACCOUNT_KEY env variable, parsing JSON credentials.");
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
  }

  if (serviceAccount) {
    const admin = require('firebase-admin');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      databaseURL: "https://ironwtf-24dbf-default-rtdb.firebaseio.com"
    });
    db = admin.database();
    console.log("Firebase Admin initialized successfully.");
  } else {
    console.warn("No Firebase service account found. Switching to local mock database.");
    useMockDb = true;
  }
} catch (error) {
  console.error("Failed to initialize Firebase Admin:", error.message);
  console.warn("Switching to local mock database due to error.");
  useMockDb = true;
}

// REST APIs
// 1. Get Top Scores (Leaderboard)
app.get('/api/leaderboard', async (req, res) => {
  try {
    if (useMockDb) {
      // Return sorted mock scores
      const sorted = [...mockScores].sort((a, b) => b.score - a.score).slice(0, 10);
      return res.json({ success: true, leaderboard: sorted, mode: "mock" });
    }

    // Fetch from Firebase Realtime Database
    const scoresRef = db.ref('scores');
    // Fetch last 100 scores to sort properly on server/client
    const snapshot = await scoresRef.orderByChild('score').limitToLast(50).once('value');
    const data = snapshot.val();
    
    let list = [];
    if (data) {
      Object.keys(data).forEach(key => {
        list.push({
          id: key,
          ...data[key]
        });
      });
    }
    
    // Sort descending by score
    list.sort((a, b) => b.score - a.score);
    const top10 = list.slice(0, 10);

    res.json({ success: true, leaderboard: top10, mode: "firebase" });
  } catch (error) {
    console.error("API error fetching leaderboard:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. Submit Score
app.post('/api/score', async (req, res) => {
  const { nickname, score, level } = req.body;

  if (!nickname || score === undefined || level === undefined) {
    return res.status(400).json({ success: false, error: "Missing nickname, score, or level." });
  }

  const cleanNickname = String(nickname).trim().substring(0, 20) || "Anonymous";
  const numScore = parseInt(score, 10) || 0;
  const numLevel = parseInt(level, 10) || 1;

  const newEntry = {
    nickname: cleanNickname,
    score: numScore,
    level: numLevel,
    timestamp: Date.now()
  };

  try {
    if (useMockDb) {
      mockScores.push(newEntry);
      console.log(`[Mock DB] Score saved: ${cleanNickname} - ${numScore} on Level ${numLevel}`);
      return res.json({ success: true, entry: newEntry, mode: "mock" });
    }

    // Write to Firebase Realtime Database
    const scoresRef = db.ref('scores');
    const newScoreRef = scoresRef.push();
    await newScoreRef.set({
      nickname: cleanNickname,
      score: numScore,
      level: numLevel,
      timestamp: Date.now() // Use exact server time or Date.now()
    });

    console.log(`[Firebase] Score saved: ${cleanNickname} - ${numScore} on Level ${numLevel}`);
    res.json({ success: true, entry: newEntry, mode: "firebase" });
  } catch (error) {
    console.error("API error saving score:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fallback to index.html for single page app experience
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`==================================================`);
  console.log(`  IMAGE BRICK BREAKER SERVER IS ONLINE`);
  console.log(`  Running on http://localhost:${PORT}`);
  console.log(`  Mode: ${useMockDb ? 'Local Mock Database' : 'Firebase Database'}`);
  console.log(`==================================================`);
});
