/* ==========================================================================
   STATE MANAGEMENT & UI ROUTING
   ========================================================================== */
const UI = {
  nicknameScreen: document.getElementById('nickname-screen'),
  lobbyScreen: document.getElementById('lobby-screen'),
  gameScreen: document.getElementById('game-screen'),
  nicknameForm: document.getElementById('nickname-form'),
  nicknameInput: document.getElementById('nickname-input'),
  displayNickname: document.getElementById('display-nickname'),
  changeNicknameBtn: document.getElementById('change-nickname-btn'),
  leaderboardRows: document.getElementById('leaderboard-rows'),
  levelCards: document.querySelectorAll('.level-card'),
  
  // Game HUD
  hudLevel: document.getElementById('hud-level'),
  hudScore: document.getElementById('hud-score'),
  hudLives: document.getElementById('hud-lives'),
  hudBricks: document.getElementById('hud-bricks'),
  
  // Game Overlays
  exitGameBtn: document.getElementById('exit-game-btn'),
  gameOverlay: document.getElementById('game-overlay'),
  overlayTitle: document.getElementById('overlay-title'),
  overlayDesc: document.getElementById('overlay-desc'),
  overlayBtn: document.getElementById('overlay-btn')
};

let playerNickname = localStorage.getItem('brick_breaker_nickname') || '';
let currentLevel = 1;
let currentScore = 0;
let apiMode = 'mock'; // will update based on server response

// Web Audio API Retro Sound Effects
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playSound(type) {
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const now = audioCtx.currentTime;

  if (type === 'bounce') {
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(300, now + 0.1);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  } else if (type === 'break') {
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(400, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
    osc.start(now);
    osc.stop(now + 0.15);
  } else if (type === 'powerup') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.3);
    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    osc.start(now);
    osc.stop(now + 0.3);
  } else if (type === 'lose') {
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.linearRampToValueAtTime(100, now + 0.5);
    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    osc.start(now);
    osc.stop(now + 0.5);
  } else if (type === 'victory') {
    // Play a beautiful cute arpeggio!
    const notes = [261.63, 329.63, 392.00, 523.25];
    notes.forEach((freq, i) => {
      const noteOsc = audioCtx.createOscillator();
      const noteGain = audioCtx.createGain();
      noteOsc.connect(noteGain);
      noteGain.connect(audioCtx.destination);
      noteOsc.type = 'sine';
      noteOsc.frequency.setValueAtTime(freq, now + i * 0.1);
      noteGain.gain.setValueAtTime(0.15, now + i * 0.1);
      noteGain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.1 + 0.2);
      noteOsc.start(now + i * 0.1);
      noteOsc.stop(now + i * 0.1 + 0.2);
    });
  }
}

// Initial Routing Check
window.addEventListener('DOMContentLoaded', () => {
  if (playerNickname) {
    showLobby();
  } else {
    showScreen(UI.nicknameScreen);
  }
});

// Nickname form submission
UI.nicknameForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const val = UI.nicknameInput.value.trim();
  if (val) {
    playerNickname = val;
    localStorage.setItem('brick_breaker_nickname', playerNickname);
    showLobby();
  }
});

// Change nickname
UI.changeNicknameBtn.addEventListener('click', () => {
  playerNickname = '';
  localStorage.removeItem('brick_breaker_nickname');
  UI.nicknameInput.value = '';
  showScreen(UI.nicknameScreen);
});

// Level selection cards
UI.levelCards.forEach(card => {
  card.addEventListener('click', () => {
    currentLevel = parseInt(card.getAttribute('data-level'), 10);
    startGameSession(currentLevel);
  });
});

// Helper: View Router
function showScreen(activeScreen) {
  [UI.nicknameScreen, UI.lobbyScreen, UI.gameScreen].forEach(screen => {
    screen.classList.remove('active');
  });
  activeScreen.classList.add('active');
}

function showLobby() {
  UI.displayNickname.textContent = playerNickname;
  showScreen(UI.lobbyScreen);
  fetchLeaderboard();
}

// Fetch Leaderboard from backend Express server
async function fetchLeaderboard() {
  try {
    const res = await fetch('/api/leaderboard');
    const data = await res.json();
    if (data.success) {
      apiMode = data.mode;
      renderLeaderboard(data.leaderboard);
    }
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    UI.leaderboardRows.innerHTML = `<tr><td colspan="4" class="text-center text-muted">連線錯誤，無法載入排行榜</td></tr>`;
  }
}

function renderLeaderboard(list) {
  if (!list || list.length === 0) {
    UI.leaderboardRows.innerHTML = `<tr><td colspan="4" class="text-center text-muted">目前尚無紀錄，搶先拿下第一名吧！</td></tr>`;
    return;
  }

  UI.leaderboardRows.innerHTML = list.map((item, index) => {
    const rank = index + 1;
    let rankBadgeClass = 'rank-other';
    if (rank === 1) rankBadgeClass = 'rank-1';
    else if (rank === 2) rankBadgeClass = 'rank-2';
    else if (rank === 3) rankBadgeClass = 'rank-3';

    const date = new Date(item.timestamp).toLocaleDateString('zh-TW', { month: '2-digit', day: '2-digit' });

    return `
      <tr>
        <td><span class="rank-badge ${rankBadgeClass}">${rank}</span></td>
        <td><strong>${escapeHTML(item.nickname)}</strong></td>
        <td><span class="text-muted">Lv.${item.level}</span></td>
        <td class="text-right" style="color: var(--color-secondary); font-weight: 800;">${item.score}</td>
      </tr>
    `;
  }).join('');
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// Submit High Score
async function submitScore(nickname, score, level) {
  try {
    await fetch('/api/score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nickname, score, level })
    });
  } catch (error) {
    console.error("Error submitting score:", error);
  }
}

/* ==========================================================================
   GAME ENGINE (HTML5 CANVAS)
   ========================================================================== */
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

let gameRunning = false;
let gameIntervalId = null;
let gameState = 'ready'; // ready, playing, paused, gameover, win

// Game Settings & Variables
const baseBallSpeed = 6;
let lives = 3;
let bricks = [];
let balls = [];
let particles = [];
let powerUps = [];

// Offscreen Canvas for Sampling average image colors
const offscreenCanvas = document.createElement('canvas');
const offscreenCtx = offscreenCanvas.getContext('2d');

const paddle = {
  x: 0,
  y: 500,
  w: 120,
  h: 15,
  speed: 10,
  color: 'hsl(190, 100%, 45%)',
  targetW: 120, // for power-ups resizing smoothly
  tilt: 0
};

// Controls
const keys = { Left: false, Right: false };
let mouseX = 0;
let useMouse = true;

// Level Images
const levelImage = new Image();

// Handle inputs
window.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'Left') { keys.Left = true; useMouse = false; }
  if (e.key === 'ArrowRight' || e.key === 'Right') { keys.Right = true; useMouse = false; }
  if (e.key === ' ') {
    e.preventDefault();
    handleActionKey();
  }
});

window.addEventListener('keyup', (e) => {
  if (e.key === 'ArrowLeft' || e.key === 'Left') keys.Left = false;
  if (e.key === 'ArrowRight' || e.key === 'Right') keys.Right = false;
});

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  useMouse = true;
});

canvas.addEventListener('click', () => {
  if (gameState === 'ready') {
    launchBall();
  }
});

function handleActionKey() {
  if (gameState === 'ready') {
    launchBall();
  } else if (gameState === 'gameover' || gameState === 'win') {
    showLobby();
  }
}

// Exit game early
UI.exitGameBtn.addEventListener('click', () => {
  stopGameSession();
  showLobby();
});

// Overlay button triggers
UI.overlayBtn.addEventListener('click', () => {
  if (gameState === 'ready') {
    launchBall();
  } else if (gameState === 'gameover' || gameState === 'win') {
    showLobby();
  }
});

/* Initialize and Start Session */
function startGameSession(levelNum) {
  showScreen(UI.gameScreen);
  
  gameState = 'ready';
  currentScore = 0;
  lives = 3;
  balls = [];
  particles = [];
  powerUps = [];
  paddle.w = 120;
  paddle.targetW = 120;
  paddle.x = canvas.width / 2 - paddle.w / 2;

  UI.hudLevel.textContent = levelNum;
  UI.hudScore.textContent = currentScore;
  UI.hudLives.textContent = '❤️'.repeat(lives);

  // Show Loading Overlay
  showOverlay("載入關卡中...", "正在解析圖像結構，請稍候...");
  
  // Load Level Image
  levelImage.onload = () => {
    buildBricksForLevel();
    createBall(canvas.width / 2, paddle.y - 12, 0, 0, false); // initial ball attached to paddle
    
    gameState = 'ready';
    showOverlay("幾何影像已就緒", "使用滑鼠/鍵盤控制擋板，點擊或按下「空白鍵」發射彈珠！");
    
    // Start loop
    if (gameIntervalId) clearInterval(gameIntervalId);
    gameRunning = true;
    gameIntervalId = requestAnimationFrame(gameLoop);
  };
  levelImage.onerror = () => {
    alert("影像載入失敗，將退回大廳。");
    showLobby();
  };
  levelImage.src = `images/level${levelNum}.jpg`;
}

function stopGameSession() {
  gameRunning = false;
  if (gameIntervalId) {
    cancelAnimationFrame(gameIntervalId);
    gameIntervalId = null;
  }
}

/* Slice Image into Bricks & Get average pixel colors */
function buildBricksForLevel() {
  const cols = 15;
  const rows = 10;
  const brickW = canvas.width / cols;
  const brickH = 25;
  const startY = 60;

  bricks = [];

  // Setup offscreen canvas to sample average colors
  offscreenCanvas.width = levelImage.naturalWidth || 800;
  offscreenCanvas.height = levelImage.naturalHeight || 550;
  offscreenCtx.drawImage(levelImage, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

  const imgW = offscreenCanvas.width;
  const imgH = offscreenCanvas.height;
  
  // Slicing parameters (assuming the image will stretch to cover the brick grid)
  const sourceSliceW = imgW / cols;
  // We sample from the top 50% of the image to map to the brick section
  const sourceSliceH = (imgH * 0.5) / rows;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const bx = c * brickW;
      const by = startY + (r * brickH);

      // Crop coordinates in the source image
      const sx = c * sourceSliceW;
      const sy = r * sourceSliceH;

      // Extract average pixel color from the center of this slice
      let brickColor = 'hsl(260, 100%, 70%)'; // default beautiful purple
      try {
        const sampleX = Math.floor(sx + sourceSliceW / 2);
        const sampleY = Math.floor(sy + sourceSliceH / 2);
        const pixelData = offscreenCtx.getImageData(sampleX, sampleY, 1, 1).data;
        if (pixelData[3] > 0) { // check alpha
          brickColor = `rgb(${pixelData[0]}, ${pixelData[1]}, ${pixelData[2]})`;
        }
      } catch (e) {
        console.warn("Unable to extract pixel data due to cross-origin limitations. Using default theme color.");
      }

      bricks.push({
        x: bx,
        y: by,
        w: brickW - 2, // 2px margin for grid separator lines
        h: brickH - 2,
        sx: sx,
        sy: sy,
        sw: sourceSliceW,
        sh: sourceSliceH,
        active: true,
        color: brickColor,
        scoreValue: (rows - r) * 10 // top bricks have higher score values
      });
    }
  }

  updateBrickHUD();
}

function updateBrickHUD() {
  const activeCount = bricks.filter(b => b.active).length;
  UI.hudBricks.textContent = `${bricks.length - activeCount}/${bricks.length}`;
}

/* ==========================================================================
   GAME LOOP & PHYSICS UPDATES
   ========================================================================== */
function gameLoop() {
  if (!gameRunning) return;

  updatePhysics();
  drawScene();

  gameIntervalId = requestAnimationFrame(gameLoop);
}

/* Update Game Mechanics */
function updatePhysics() {
  // 1. Paddle Movement
  let prevPaddleX = paddle.x;
  if (useMouse) {
    paddle.x = mouseX - paddle.w / 2;
  } else {
    if (keys.Left) paddle.x -= paddle.speed;
    if (keys.Right) paddle.x += paddle.speed;
  }

  // Constrain Paddle X bounds
  if (paddle.x < 0) paddle.x = 0;
  if (paddle.x > canvas.width - paddle.w) paddle.x = canvas.width - paddle.w;

  // Calculate tilt velocity for premium animation
  paddle.tilt = (paddle.x - prevPaddleX) * 0.15;
  paddle.tilt = Math.max(Math.min(paddle.tilt, 0.4), -0.4);
  paddle.tilt *= 0.85; // drag deceleration

  // Smoothly resize paddle if active power-up
  if (paddle.w !== paddle.targetW) {
    paddle.w += (paddle.targetW - paddle.w) * 0.1;
  }

  // 2. Balls Updates
  for (let i = balls.length - 1; i >= 0; i--) {
    const ball = balls[i];

    if (gameState === 'ready') {
      // Keep ball attached to the center top of the paddle
      ball.x = paddle.x + paddle.w / 2;
      ball.y = paddle.y - ball.radius - 2;
      continue;
    }

    // Move ball
    ball.x += ball.dx;
    ball.y += ball.dy;

    // Boundary Collisions (Left / Right Walls)
    if (ball.x - ball.radius <= 0) {
      ball.x = ball.radius;
      ball.dx = -ball.dx;
      playSound('bounce');
    } else if (ball.x + ball.radius >= canvas.width) {
      ball.x = canvas.width - ball.radius;
      ball.dx = -ball.dx;
      playSound('bounce');
    }

    // Boundary Collision (Ceiling)
    if (ball.y - ball.radius <= 0) {
      ball.y = ball.radius;
      ball.dy = -ball.dy;
      playSound('bounce');
    }

    // Bottom out of bounds (Fall into void)
    if (ball.y - ball.radius > canvas.height) {
      // Remove this ball
      balls.splice(i, 1);
      continue;
    }

    // Paddle Collision Detection
    if (ball.dy > 0 && 
        ball.y + ball.radius >= paddle.y && 
        ball.y - ball.radius <= paddle.y + paddle.h &&
        ball.x >= paddle.x && 
        ball.x <= paddle.x + paddle.w) {
      
      // Dynamic bounce angle based on hit location
      const hitPoint = (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
      const angle = hitPoint * (Math.PI / 3.2); // max ~55 degrees

      ball.dx = ball.speed * Math.sin(angle);
      ball.dy = -ball.speed * Math.cos(angle);
      
      // Push ball up slightly to prevent stickiness
      ball.y = paddle.y - ball.radius;
      playSound('bounce');
    }

    // Bricks Collision Detection
    for (let b = 0; b < bricks.length; b++) {
      const brick = bricks[b];
      if (!brick.active) continue;

      // Circle-AABB intersection check
      let closestX = Math.max(brick.x, Math.min(ball.x, brick.x + brick.w));
      let closestY = Math.max(brick.y, Math.min(ball.y, brick.y + brick.h));

      let distanceX = ball.x - closestX;
      let distanceY = ball.y - closestY;
      let distanceSquared = (distanceX * distanceX) + (distanceY * distanceY);

      if (distanceSquared < (ball.radius * ball.radius)) {
        // Hit!
        brick.active = false;
        playSound('break');
        spawnParticles(brick.x + brick.w / 2, brick.y + brick.h / 2, brick.color);
        
        currentScore += brick.scoreValue;
        UI.hudScore.textContent = currentScore;
        updateBrickHUD();

        // Bounce resolution
        // Check which face of the rectangle the ball hit
        const overlapX = ball.radius - Math.abs(distanceX);
        const overlapY = ball.radius - Math.abs(distanceY);

        if (overlapX < overlapY) {
          // Horizontal hit
          ball.dx = distanceX > 0 ? Math.abs(ball.dx) : -Math.abs(ball.dx);
        } else {
          // Vertical hit
          ball.dy = distanceY > 0 ? Math.abs(ball.dy) : -Math.abs(ball.dy);
        }

        // 15% chance to drop a random Power-up capsule
        if (Math.random() < 0.15) {
          spawnPowerUp(brick.x + brick.w/2, brick.y + brick.h);
        }

        // Check level win condition
        checkWinCondition();
        break; // Only break one brick per frame
      }
    }
  }

  // 3. Handle Lost Lives (No balls left on board)
  if (balls.length === 0 && gameState === 'playing') {
    lives--;
    playSound('lose');
    UI.hudLives.textContent = '❤️'.repeat(lives);

    if (lives <= 0) {
      triggerGameOver();
    } else {
      gameState = 'ready';
      createBall(canvas.width / 2, paddle.y - 12, 0, 0, false);
      showOverlay("彈珠掉落！", "別氣餒，按下「空白鍵」或點擊畫面重新出發！");
    }
  }

  // 4. Update Power-ups
  for (let i = powerUps.length - 1; i >= 0; i--) {
    const p = powerUps[i];
    p.y += p.vy;

    // Collect powerup
    if (p.y + p.size >= paddle.y &&
        p.y - p.size <= paddle.y + paddle.h &&
        p.x >= paddle.x &&
        p.x <= paddle.x + paddle.w) {
      
      activatePowerUp(p.type);
      playSound('powerup');
      powerUps.splice(i, 1);
      continue;
    }

    // Out of bounds
    if (p.y > canvas.height) {
      powerUps.splice(i, 1);
    }
  }

  // 5. Update Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.vy += 0.1; // gravity
    pt.alpha -= pt.decay;
    if (pt.alpha <= 0) {
      particles.splice(i, 1);
    }
  }
}

/* ==========================================================================
   RENDER SCENE (CANVAS DRAWING)
   ========================================================================== */
function drawScene() {
  // Clear Canvas (Black Background is default)
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 1. Draw Bricks (Render cropped portions of the level image)
  bricks.forEach(brick => {
    if (!brick.active) return;
    
    // Draw slice of image on brick's location
    ctx.drawImage(
      levelImage,
      brick.sx, brick.sy, brick.sw, brick.sh, // Source Image rect
      brick.x, brick.y, brick.w, brick.h      // Destination Canvas rect
    );

    // Subtle dark border around bricks for grid definition
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.strokeRect(brick.x, brick.y, brick.w, brick.h);
  });

  // 2. Draw Particles
  particles.forEach(pt => {
    ctx.save();
    ctx.globalAlpha = pt.alpha;
    ctx.fillStyle = pt.color;
    ctx.shadowBlur = 10;
    ctx.shadowColor = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });

  // 3. Draw Power-ups
  powerUps.forEach(p => {
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = p.glowColor;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw icon inside capsule
    ctx.fillStyle = p.glowColor;
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.icon, p.x, p.y);
    ctx.restore();
  });

  // 4. Draw Paddle (Glowing rounded container with skew/tilt velocity)
  ctx.save();
  ctx.translate(paddle.x + paddle.w / 2, paddle.y + paddle.h / 2);
  ctx.transform(1, 0, paddle.tilt, 1, 0, 0); // tilt skew animation
  
  // Glow effect
  ctx.shadowBlur = 15;
  ctx.shadowColor = paddle.color;
  
  // Rounded rect paddle
  ctx.fillStyle = paddle.color;
  ctx.beginPath();
  const radius = paddle.h / 2;
  ctx.roundRect(-paddle.w / 2, -paddle.h / 2, paddle.w, paddle.h, radius);
  ctx.fill();
  
  // Highlight overlay
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.beginPath();
  ctx.roundRect(-paddle.w / 2 + 5, -paddle.h / 2 + 2, paddle.w - 10, 3, 1.5);
  ctx.fill();
  ctx.restore();

  // 5. Draw Balls
  balls.forEach(ball => {
    ctx.save();
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#ffffff';
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

/* ==========================================================================
   HELPER CONSTRUCTORS & ACTIONS
   ========================================================================== */

// Create ball utility
function createBall(x, y, dx, dy, moving = true) {
  const ball = {
    x: x,
    y: y,
    dx: dx,
    dy: dy,
    radius: 8,
    speed: baseBallSpeed,
    moving: moving
  };
  balls.push(ball);
}

// Launch attached ball
function launchBall() {
  const attachedBall = balls.find(b => !b.moving);
  if (attachedBall) {
    // Launch angle pointing upwards slightly offsetted
    const angle = (Math.random() * 0.4 - 0.2) * Math.PI; // -36 to 36 degrees from vertical
    attachedBall.dx = attachedBall.speed * Math.sin(angle);
    attachedBall.dy = -attachedBall.speed * Math.cos(angle);
    attachedBall.moving = true;
    
    gameState = 'playing';
    hideOverlay();
  }
}

// Spark Particles Spawner
function spawnParticles(x, y, color) {
  const count = 12;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 4;
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1.5, // initial upward pop
      color: color,
      size: 2 + Math.random() * 3,
      alpha: 1,
      decay: 0.015 + Math.random() * 0.02
    });
  }
}

// Power-ups Spawner
function spawnPowerUp(x, y) {
  const list = [
    { type: 'multiball', icon: '⭐', color: '#ffb300' },
    { type: 'expand', icon: '↔️', color: '#00e5ff' },
    { type: 'slow', icon: '⏰', color: '#d500f9' }
  ];
  const choice = list[Math.floor(Math.random() * list.length)];

  powerUps.push({
    x: x,
    y: y,
    vy: 2.2,
    size: 11,
    type: choice.type,
    icon: choice.icon,
    glowColor: choice.color
  });
}

// Activate Capsule effects
function activatePowerUp(type) {
  if (type === 'multiball') {
    // Spawn 2 extra balls at the paddle going up-left and up-right
    createBall(paddle.x + paddle.w / 2, paddle.y - 15, -4, -4);
    createBall(paddle.x + paddle.w / 2, paddle.y - 15, 4, -4);
  } else if (type === 'expand') {
    paddle.targetW = 180;
    // Set 10s cooldown to shrink paddle back
    setTimeout(() => {
      paddle.targetW = 120;
    }, 10000);
  } else if (type === 'slow') {
    // Slow down all active balls temporarily
    balls.forEach(b => {
      b.dx *= 0.6;
      b.dy *= 0.6;
      b.speed = baseBallSpeed * 0.6;
    });
    setTimeout(() => {
      balls.forEach(b => {
        b.speed = baseBallSpeed;
        // Normalize speed
        const angle = Math.atan2(b.dx, b.dy);
        b.dx = b.speed * Math.sin(angle);
        b.dy = b.speed * Math.cos(angle);
      });
    }, 8000);
  }
}

/* Win / Loss State Handlers */
function checkWinCondition() {
  const activeCount = bricks.filter(b => b.active).length;
  if (activeCount === 0 && gameState === 'playing') {
    gameState = 'win';
    playSound('victory');
    stopGameSession();
    
    // Extra victory bonus score
    const victoryBonus = lives * 1000;
    currentScore += victoryBonus;
    UI.hudScore.textContent = currentScore;
    
    // Submit score to database asynchronously
    submitScore(playerNickname, currentScore, currentLevel);
    
    showOverlay(
      "👑 恭喜通關！ 👑", 
      `您成功擊碎所有影像磚塊！得到總分：<strong>${currentScore}</strong> 點（含生命值獎勵）。分數已上傳至排行榜！`, 
      "回到大廳"
    );
  }
}

function triggerGameOver() {
  gameState = 'gameover';
  stopGameSession();
  
  // Submit score to database asynchronously
  submitScore(playerNickname, currentScore, currentLevel);

  showOverlay(
    "💀 遊戲結束 💀", 
    `生命值耗盡！您本場比賽在 Level ${currentLevel} 獲得了：<strong>${currentScore}</strong> 點。分數已上傳至排行榜！`, 
    "返回大廳"
  );
}

/* UI Overlays Handlers */
function showOverlay(title, description, btnText = "確定") {
  UI.overlayTitle.innerHTML = title;
  UI.overlayDesc.innerHTML = description;
  UI.overlayBtn.textContent = btnText;
  UI.gameOverlay.classList.add('active');
}

function hideOverlay() {
  UI.gameOverlay.classList.remove('active');
}
