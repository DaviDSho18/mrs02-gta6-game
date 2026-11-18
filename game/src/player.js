// Milo's on-foot movement, vehicle entry, health and personal progression.
import { PLAYER, START } from './config.js';
import { nearestCar } from './vehicles.js';

export function createPlayer(world) {
  const lot = world.landmark('marina').block;
  return {
    name: 'Milo Reyes', x: lot.x + 182, y: lot.y + 252, vx: 0, vy: 0,
    angle: -Math.PI / 2, radius: PLAYER.radius, health: PLAYER.maxHealth, armor: 24,
    money: START.money, vehicle: null, wantedHeat: 0, fireCooldown: 0,
    invulnerable: 0, weapon: 'Vega 9', ammo: Infinity, kills: 0,
    saveTimer: 0, toast: '', toastTimer: 0,
  };
}

export function updatePlayer(player, input, cars, world, dt, onSteal = () => {}) {
  player.fireCooldown = Math.max(0, player.fireCooldown - dt);
  player.invulnerable = Math.max(0, player.invulnerable - dt);
  player.toastTimer = Math.max(0, player.toastTimer - dt);
  player.interactPulse = input.consume('KeyE') || input.consume('KeyF');
  if (player.interactPulse) {
    if (player.vehicle) {
      const car = player.vehicle;
      car.occupied = false; car.parked = false;
      const side = car.angle + Math.PI / 2;
      const nx = car.x + Math.cos(side) * 38;
      const ny = car.y + Math.sin(side) * 38;
      player.vehicle = null;
      player.x = nx; player.y = ny; player.vx = 0; player.vy = 0;
      world.resolveCircle(player, player.radius);
    } else {
      const car = nearestCar(cars, player.x, player.y, 78);
      if (car) {
        car.occupied = true; car.parked = false;
        player.vehicle = car; player.x = car.x; player.y = car.y; player.angle = car.angle;
        if (!car.stolen) { car.stolen = true; onSteal(car); }
      }
    }
  }
  if (player.vehicle) {
    player.x = player.vehicle.x; player.y = player.vehicle.y; player.angle = player.vehicle.angle;
    return;
  }
  const axis = input.move();
  const speed = input.held('ShiftLeft') || input.held('ShiftRight') ? PLAYER.sprintSpeed : PLAYER.walkSpeed;
  const tx = axis.x * speed; const ty = axis.y * speed;
  const blend = 1 - Math.exp(-PLAYER.accel * dt);
  player.vx += (tx - player.vx) * blend; player.vy += (ty - player.vy) * blend;
  const oldX = player.x; const oldY = player.y;
  player.x += player.vx * dt; player.y += player.vy * dt;
  world.resolveCircle(player, player.radius);
  const p = world.clamp(player.x, player.y); player.x = p.x; player.y = p.y;
  if (Math.hypot(player.x - oldX, player.y - oldY) > 0.05) player.angle = Math.atan2(player.vy, player.vx);
}

export function damagePlayer(player, amount) {
  if (player.invulnerable > 0) return false;
  const shield = Math.min(player.armor, amount * 0.65);
  player.armor -= shield;
  player.health = Math.max(0, player.health - (amount - shield));
  player.invulnerable = 0.3;
  return true;
}

export function respawnPlayer(player, world) {
  if (player.vehicle) player.vehicle.occupied = false;
  player.vehicle = null;
  const p = world.hub.start;
  player.x = p.x; player.y = p.y; player.vx = 0; player.vy = 0;
  player.health = 70; player.armor = 0; player.money = Math.max(0, player.money - 150);
  player.invulnerable = 3; player.toast = 'You made it to the clinic. $150 fee.'; player.toastTimer = 3.5;
}
