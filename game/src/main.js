// Boot, persistence, scene presets and fixed-step game loop.
import { CITY, SAVE_KEY, START, STEP, STORY } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { createInput } from './input.js';
import { createRenderer, SCREEN_MAP, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { createPlayer, damagePlayer, respawnPlayer, updatePlayer } from './player.js';
import { addParkedCar, createVehicles, nearestCar, updateVehicles } from './vehicles.js';
import { createPedestrians, panicNearby, updatePedestrians } from './pedestrians.js';
import { addPickup, createCombat, firePlayer, updateCombat } from './combat.js';
import { addCrime, createPolice, setWanted, updatePolice } from './police.js';
import { createMissions, currentMission, objective, updateMissions } from './missions.js';
import { createAudio } from './audio.js';
import { SHOT_SCENES } from './shots.js';

const params = new URLSearchParams(location.search);
const seedValue = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isFinite(seedValue) ? seedValue >>> 0 : 901902;
const canvas = document.getElementById('game');
const status = document.getElementById('status');
const random = createRandom(seed);
const world = createWorld(random);
const renderer = createRenderer(canvas);
const input = createInput(canvas);
const audio = createAudio();
let screen = SCREEN_TITLE, accumulator = 0, last = performance.now(), now = 0;
let saveClock = 0, weaponIndex = 0, bestCash = 0, shotMode = params.get('shot');

function loadSave() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null'); return s && typeof s === 'object' ? s : {}; }
  catch { return {}; }
}
function persist() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ money: game.player.money, mission: game.missions.index,
      stage: game.missions.stage, kills: game.player.kills, health: game.player.health, district: 'San Aurelio', savedAt: Date.now() }));
  } catch { /* storage may be disabled; current run remains playable */ }
}
const saved = loadSave();
const player = createPlayer(world);
player.money = Math.max(START.money, Number(saved.money) || START.money);
player.kills = Number(saved.kills) || 0;
const cars = createVehicles(world, random, world.spawnPoint);
const pedestrians = createPedestrians(world, random, player);
const combat = createCombat();
const police = createPolice();
const missions = createMissions(random);
if (Number(saved.mission) > 0 && Number(saved.mission) < STORY.missions.length) {
  missions.index = Number(saved.mission); missions.stage = Number(saved.stage) || 0;
  missions.toast = 'CAREER RESTORED. Val is back on the radio.'; missions.toastTimer = 4;
}
const game = { world, player, cars, pedestrians, combat, police, missions, time: 0, objective: null, toast: '', toastTimer: 0, nearCar: null };
const shot = SHOT_SCENES[shotMode];
if (shot) stageShot(shot);
else { game.objective = objective(missions, world); status.textContent = 'Sunset Run. Press Enter or click to play.'; requestAnimationFrame(frame); }

function stageShot(scene) {
  game.time = 0;
  if (scene === 'title') {
    screen = SCREEN_TITLE;
    renderer.draw(game, screen, bestCash);
  } else {
    screen = SCREEN_PLAY;
    if (scene === 'walk') {
      player.x = world.landmark('plaza').x - 70; player.y = world.landmark('plaza').y + 80;
      player.vehicle = null; game.missions.index = 0; game.missions.stage = 0;
      game.missions.toast = 'NOVA: “A warm evening in San Aurelio. Watch the crosswalks, Milo.”'; game.missions.toastTimer = 8;
      stageTraffic(player.x, player.y);
      stageCrowd(player.x, player.y);
    } else if (scene === 'mission') {
      player.x = world.landmark('marina').x - 100; player.y = world.landmark('marina').y + 145;
      player.vehicle = null; game.missions.index = 0; game.missions.stage = 0;
      game.missions.toast = 'VAL: “Welcome home, sailor. My lot needs wheels.”'; game.missions.toastTimer = 10;
    } else {
      const hot = world.landmark('tower');
      player.vehicle = cars.find(c => c.tag === 'Marina Lot') ?? cars[0];
      player.vehicle.occupied = true; player.vehicle.x = hot.x - 120; player.vehicle.y = hot.y + 214;
      player.vehicle.angle = -Math.PI / 2; player.vehicle.speed = 264; player.x = player.vehicle.x; player.y = player.vehicle.y;
      player.vehicle.stolen = true; player.money = 1850;
      game.missions.index = 2; game.missions.stage = 1;
      const crew = awaitlessCrew(hot);
      pedestrians.push(...crew);
      missions.crew = crew;
      setWanted(police, scene === 'shootout' ? 3 : 2);
      updatePolice(police, player, world, combat, 0, 0);
      // Stage the patrols within the camera frame so the cover proves the chase at a glance.
      police.units.forEach((cop, i) => { cop.x = player.x - 255 - i * 120; cop.y = player.y + (i % 2 ? -76 : 76); cop.angle = 0; });
      while (police.units.length < (scene === 'shootout' ? 3 : 2)) {
        const i = police.units.length;
        police.units.push({ x: player.x - 260 - i * 120, y: player.y + (i % 2 ? -74 : 74), angle: 0, speed: 0, health: 150, fireClock: 0.2, blink: i * 0.3, siren: true, radius: 18 });
      }
      game.missions.toast = scene === 'shootout' ? 'SOL FM IS BACK ON AIR. Lose the sirens, Milo!' : 'VAL: “That is not a radio maintenance crew. Make your point.”'; game.missions.toastTimer = 12;
      stageTraffic(player.x, player.y);
      stageCrowd(player.x, player.y);
      if (scene === 'shootout') {
        player.vehicle.occupied = false; player.vehicle = null;
        player.x = hot.x - 130; player.y = hot.y + 240; player.angle = -Math.PI / 2;
        for (let i = 0; i < 7; i++) combat.bullets.push({ x: player.x + i * 13, y: player.y - 30, vx: 110 + i * 18, vy: -230, life: 0.5, damage: 20, team: 'player', color: '#ffe38b', radius: 3 });
        combat.effects.push({ x: player.x + 28, y: player.y - 24, life: 0.12, max: 0.12, color: '#fff2bc', type: 'muzzle' });
      }
    }
    game.objective = objective(missions, world);
    renderer.camera.snapTo(player.x, player.y);
    renderer.draw(game, SCREEN_PLAY, bestCash);
  }
  requestAnimationFrame(() => { renderer.draw(game, screen, bestCash); window.__shotReady = true; });
}
function awaitlessCrew(landmark) {
  const pts = [[-90,-82],[82,-95],[100,60],[-72,84]];
  return pts.map((q,i)=>({ id:1000+i,x:landmark.x+q[0],y:landmark.y+q[1],vx:0,vy:0,angle:Math.atan2(-q[1],-q[0]),health:58,color:'#423748',fleeing:0,targetX:landmark.x,targetY:landmark.y,speed:44,hostile:true,dead:false,fireCooldown:1,label:'Coquina crew' }));
}
function stageTraffic(x, y) {
  const carsNear = cars.filter(c => c.traffic).slice(0, 6);
  carsNear.forEach((car, i) => {
    car.x = x + (i - 2.5) * 118; car.y = y + (i % 2 ? -160 : 164);
    car.axis = 'h'; car.lane = car.y; car.dir = i % 2 ? -1 : 1; car.angle = car.dir > 0 ? 0 : Math.PI;
  });
}
function stageCrowd(x, y) {
  const nearby = pedestrians.filter(p => !p.hostile).slice(0, 15);
  nearby.forEach((p, i) => {
    const a = i / nearby.length * Math.PI * 2;
    p.x = x + Math.cos(a) * (210 + i % 3 * 32); p.y = y + Math.sin(a) * (130 + i % 2 * 45);
    p.targetX = p.x + Math.cos(a) * 120; p.targetY = p.y + Math.sin(a) * 120;
  });
}

function startGame() {
  screen = SCREEN_PLAY;
  audio.unlock();
  if (game.missions.toastTimer <= 0) { game.missions.toast = STORY.intro; game.missions.toastTimer = 5; }
  renderer.camera.snapTo(player.x, player.y);
  status.textContent = 'Playing in San Aurelio. WASD move, E steal a car, mouse aim and click fire.';
}
function crime(stars = 1) { addCrime(police, stars); audio.crime(); }
function update(dt) {
  game.time += dt; now = game.time;
  const beforeMission = missions.index;
  game.nearCar = player.vehicle ? null : nearestCar(cars, player.x, player.y, 76);
  const firing = input.pointer.down || input.pointer.pressed;
  if (input.consume('Digit1')) weaponIndex = 0;
  if (input.consume('Digit2')) weaponIndex = 1;
  if (input.consume('Digit3')) weaponIndex = 2;
  if (input.consume('KeyM')) { screen = screen === SCREEN_MAP ? SCREEN_PLAY : SCREEN_MAP; }
  if (input.consume('KeyP') || input.consume('Escape')) {
    if (screen === SCREEN_PLAY) screen = SCREEN_PAUSED;
    else if (screen === SCREEN_PAUSED || screen === SCREEN_MAP) screen = SCREEN_PLAY;
  }
  if (screen === SCREEN_MAP || screen === SCREEN_PAUSED) return;
  const wasVehicle = !!player.vehicle;
  updatePlayer(player, input, cars, world, dt, () => { crime(1); player.toast = 'HOT VEHICLE  ·  SAN AURELIO PD ALERTED'; player.toastTimer = 2.4; });
  if (!wasVehicle && player.vehicle) audio.unlock();
  updateVehicles(cars, player, input, world, dt);
  updatePedestrians(pedestrians, player, world, dt);
  if (firing && input.pointer.inside && !player.vehicle) {
    const point = { x: renderer.camera.x + (input.pointer.x - renderer.camera.width / 2), y: renderer.camera.y + (input.pointer.y - renderer.camera.height / 2) };
    if (firePlayer(combat, player, point, random, weaponIndex)) {
      audio.gun(); crime(1); panicNearby(pedestrians, player.x, player.y);
    }
  }
  updateCombat(combat, player, pedestrians, police, world, dt, {
    hit(p) { if (!p.hostile && !p.dead) crime(2); },
    downPed(p) { if (!p.hostile) { crime(1); addPickup(combat,p.x,p.y,'cash',50); } else { player.kills++; player.money += 35; } },
    hitCop() { crime(3); }, downCop() { player.money += 100; player.kills++; },
    damagePlayer(amount) { damagePlayer(player, amount); },
  });
  // Contact pickup and vehicle collisions.
  for (const pickup of combat.pickups) if (Math.hypot(pickup.x-player.x,pickup.y-player.y)<30) {
    if (pickup.type==='cash') player.money += pickup.value; else player.health=Math.min(100,player.health+25);
    pickup.life=0;
  }
  updatePolice(police, player, world, combat, dt, game.time);
  updateMissions(missions, player, world, police, pedestrians, input, dt, () => { audio.mission(); });
  game.objective = objective(missions, world);
  if (missions.index !== beforeMission) { audio.mission(); persist(); }
  player.toast = missions.toastTimer > 0 ? missions.toast : player.toastTimer > 0 ? player.toast : '';
  game.toastTimer = missions.toastTimer > 0 ? missions.toastTimer : player.toastTimer;
  if (player.health <= 0) respawnPlayer(player, world);
  player.saveTimer += dt; saveClock += dt;
  if (saveClock > 8) { persist(); saveClock=0; }
  audio.update(player.vehicle, police.stars);
}
function frame(t) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.25,(t-last)/1000); last=t; accumulator += dt;
  if (screen === SCREEN_TITLE) {
    if (input.consume('Enter') || input.consume('Space') || input.pointer.pressed) startGame();
  } else if (screen === SCREEN_PLAY) {
    while (accumulator >= STEP) { update(STEP); accumulator -= STEP; if (screen !== SCREEN_PLAY) break; }
  } else accumulator = 0;
  game.objective = objective(missions, world);
  game.nearCar = player.vehicle ? null : nearestCar(cars, player.x, player.y, 76);
  renderer.draw(game, screen, bestCash);
  input.clearEdges();
}
document.addEventListener('visibilitychange', () => { if (document.hidden && screen === SCREEN_PLAY) screen = SCREEN_PAUSED; });
window.addEventListener('beforeunload', persist);
