// === DOM элементы ===
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const mainMenu = document.getElementById("mainMenu");
const settingsMenu = document.getElementById("settingsMenu");
const gameOverScreen = document.getElementById("gameOverScreen");
const nicknameInput = document.getElementById("nicknameInput");
const menuNickname = document.getElementById("menuNickname");
const menuRecord = document.getElementById("menuRecord");

// === Данные пользователя ===
let nickname = localStorage.getItem("nickname") || "Гость";
let record = parseInt(localStorage.getItem("record")) || 0;
let musicVolume = parseFloat(localStorage.getItem("musicVolume")) || 1;
let sfxVolume = parseFloat(localStorage.getItem("sfxVolume")) || 1;

// === Обновить UI в меню ===
function updateMenuUI() {
  menuNickname.textContent = `Ник: ${nickname}`;
  menuRecord.textContent = `🏆 Рекорд: ${record}`;
  nicknameInput.value = nickname;
}

// === Настройки ===
function openSettings() {
  mainMenu.style.display = "none";
  settingsMenu.style.display = "flex";
}

function backToMainMenu() {
  settingsMenu.style.display = "none";
  gameOverScreen.style.display = "none";
  mainMenu.style.display = "flex";
  updateMenuUI();
}

function saveSettings() {
  nickname = nicknameInput.value || "Гость";
  localStorage.setItem("nickname", nickname);
  localStorage.setItem("musicVolume", document.getElementById("musicVolume").value);
  localStorage.setItem("sfxVolume", document.getElementById("sfxVolume").value);
  backToMainMenu();
}

function exitGame() {
  window.close(); // Может не сработать в браузерах — зависит от прав
}

// === Игра ===
let player, bullets, enemies, bossBullets, bonuses, boss;
let score = 0;
let bossMode = false;
let bossHP = 35;
let killedBosses = 0;
let enemySpawnInterval = 2000;
let lastShotTime = 0;
let lastEnemySpawn = 0;
let keys = {};

const lanes = [canvas.width / 5, 2 * canvas.width / 5, 3 * canvas.width / 5, 4 * canvas.width / 5];

// === Изображения ===
const backgroundImg = new Image(); backgroundImg.src = "assets/fone.png";
const playerImg = new Image(); playerImg.src = "assets/mainchar.png";
const bulletImg = new Image(); bulletImg.src = "assets/bullet.png";
const bossBulletImg = new Image(); bossBulletImg.src = "assets/bossbullet.png";
const minion1Img = new Image(); minion1Img.src = "assets/minion1.png";
const minion2Img = new Image(); minion2Img.src = "assets/minion2.png";
const heartImg = new Image(); heartImg.src = "assets/heart.png";
const dpsImg = new Image(); dpsImg.src = "assets/dps.png";
const bossImg = new Image(); bossImg.src = "assets/boss.png";

// === Запуск игры ===
function startGame() {
  mainMenu.style.display = "none";
  gameOverScreen.style.display = "none";
  nickname = nicknameInput.value || "Гость";
  score = 0;
  bossMode = false;
  boss = null;
  bossHP = 35 + killedBosses * 5;
  enemySpawnInterval = 2000 - killedBosses * 200;

  player = { lane: 1, x: lanes[1], y: canvas.height - 120, width: 87.5, height: 87.5, hp: 5, shootInterval: 750 };
  bullets = [];
  bossBullets = [];
  enemies = [];
  bonuses = [];

  keys = {};
  document.addEventListener("keydown", e => keys[e.key.toLowerCase()] = true);
  document.addEventListener("keyup", e => keys[e.key.toLowerCase()] = false);

  requestAnimationFrame(gameLoop);
}

// === Игровой цикл ===
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  handleInput();
  drawPlayer();
  updateBullets();
  updateBossBullets();
  updateEnemies();
  updateBonuses();
  drawEnemies();
  drawBonuses();
  drawBullets();
  drawBossBullets();
  drawBoss();
  drawUI();
  updateBoss();

  if (player.hp <= 0) {
    endGame();
    return;
  }

  requestAnimationFrame(gameLoop);
}

// === Отрисовка ===
function drawBackground() {
  ctx.drawImage(backgroundImg, 0, 0, canvas.width, canvas.height);
}

function drawPlayer() {
  player.x = lanes[player.lane];
  ctx.drawImage(playerImg, player.x - player.width / 2, player.y - player.height / 2, player.width, player.height);
}

function drawBullets() {
  bullets.forEach(b => {
    ctx.drawImage(bulletImg, b.x - 11.25, b.y - 11.25, 22.5, 22.5);
  });
}

function drawBossBullets() {
  bossBullets.forEach(b => {
    ctx.drawImage(bossBulletImg, b.x - 11.25, b.y - 11.25, 22.5, 22.5);
  });
}

function drawEnemies() {
  enemies.forEach(e => {
    let img = e.type === 1 ? minion1Img : minion2Img;
    ctx.drawImage(img, e.x - 60, e.y - 60, 120, 120);
  });
}

function drawBoss() {
  if (boss) {
    ctx.drawImage(bossImg, boss.x - 100, boss.y - 100, 200, 200);
  }
}

function drawBonuses() {
  bonuses.forEach(b => {
    let img = b.type === "heart" ? heartImg : dpsImg;
    ctx.drawImage(img, b.x - 21, b.y - 21, 42, 42);
  });
}

function drawUI() {
  for (let i = 0; i < player.hp; i++) {
    ctx.drawImage(heartImg, 10 + i * 30, 10, 25, 25);
  }
  ctx.fillStyle = "yellow";
  ctx.font = "20px Arial";
  ctx.fillText(`🏆 ${score}`, canvas.width - 100, 30);
}

// === Управление ===
function handleInput() {
  if ((keys["arrowleft"] || keys["a"]) && player.lane > 0) {
    player.lane--;
    keys["arrowleft"] = false;
    keys["a"] = false;
  }
  if ((keys["arrowright"] || keys["d"]) && player.lane < 3) {
    player.lane++;
    keys["arrowright"] = false;
    keys["d"] = false;
  }

  if (Date.now() - lastShotTime > player.shootInterval) {
    bullets.push({ x: player.x, y: player.y - 30 });
    lastShotTime = Date.now();
  }
}

// === Обновление объектов ===
function updateBullets() {
  bullets = bullets.filter(b => {
    b.y -= 10;
    enemies.forEach(e => {
      if (Math.abs(b.x - e.x) < 30 && Math.abs(b.y - e.y) < 30) {
        e.hp--;
        b.hit = true;
      }
    });
    if (boss && Math.abs(b.x - boss.x) < 60 && Math.abs(b.y - boss.y) < 60) {
      boss.hp--;
      b.hit = true;
    }
    return !b.hit && b.y > 0;
  });
}

function updateBossBullets() {
  bossBullets = bossBullets.filter(b => {
    b.y += 6;
    if (Math.abs(b.x - player.x) < 30 && Math.abs(b.y - player.y) < 30) {
      player.hp--;
      return false;
    }
    return b.y < canvas.height;
  });
}

function updateEnemies() {
  enemies = enemies.filter(e => {
    e.y += 2;
    if (e.hp <= 0) {
      score += 50;
      if (Math.random() < 0.15) bonuses.push({ x: e.x, y: e.y, type: "heart" });
      else if (Math.random() < 0.10) bonuses.push({ x: e.x, y: e.y, type: "dps" });
      return false;
    }
    if (e.y > canvas.height) {
      player.hp--;
      return false;
    }
    return true;
  });

  if (!bossMode && Date.now() - lastEnemySpawn > enemySpawnInterval) {
    let lane = Math.floor(Math.random() * 4);
    enemies.push({ x: lanes[lane], y: -60, lane, hp: 2, type: Math.random() < 0.5 ? 1 : 2 });
    lastEnemySpawn = Date.now();
  }

  if (!bossMode && score >= (killedBosses + 1) * 30 * 50) {
    boss = { x: canvas.width / 2, y: 120, hp: bossHP };
    bossMode = true;
    enemies = [];
  }
}

function updateBonuses() {
  bonuses = bonuses.filter(b => {
    b.y += 2;
    if (Math.abs(b.x - player.x) < 30 && Math.abs(b.y - player.y) < 30) {
      if (b.type === "heart" && player.hp < 5) player.hp++;
      if (b.type === "dps") player.shootInterval = Math.max(50, player.shootInterval - 50);
      return false;
    }
    return b.y < canvas.height;
  });
}

function updateBoss() {
  if (!boss) return;

  if (!boss.moveTimer || Date.now() - boss.moveTimer > 800) {
    const lane = Math.floor(Math.random() * 4);
    boss.x = lanes[lane];
    boss.moveTimer = Date.now();

    // Выстрел
    bossBullets.push({ x: boss.x, y: boss.y + 50 });
  }

  if (boss.hp <= 0) {
    score += 200 + killedBosses * 50;
    killedBosses++;
    bossHP += 5;
    enemySpawnInterval = Math.max(400, enemySpawnInterval - 200);
    boss = null;
    bossMode = false;
  }
}

// === Конец игры ===
function endGame() {
  if (score > record) {
    record = score;
    localStorage.setItem("record", record);
  }
  gameOverScreen.style.display = "flex";
}
document.getElementById("leftBtn").addEventListener("touchstart", () => {
  if (player.lane > 0) player.lane--;
});

document.getElementById("rightBtn").addEventListener("touchstart", () => {
  if (player.lane < 3) player.lane++;
});

// === Запуск ===
document.addEventListener("DOMContentLoaded", () => {
  updateMenuUI();
  mainMenu.style.display = "flex";
});
