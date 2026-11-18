// Hitscan-feeling projectiles, muzzle sparks, damage and pickups. No image or sound assets.
import { WEAPONS } from './config.js';
import { distanceSq } from './random.js';

export function createCombat() { return { bullets: [], effects: [], pickups: [], shotTimer: 0 }; }
export function firePlayer(combat, player, target, random, weaponIndex = 0) {
  const specs = [WEAPONS.pistol, WEAPONS.smg, WEAPONS.shotgun];
  const spec = specs[weaponIndex] ?? specs[0];
  if (player.fireCooldown > 0) return false;
  player.fireCooldown = spec.rate;
  const base = Math.atan2(target.y - player.y, target.x - player.x);
  for (let i = 0; i < spec.pellets; i += 1) {
    const angle = base + (random() - 0.5) * spec.spread;
    combat.bullets.push({ x: player.x + Math.cos(angle) * 18, y: player.y + Math.sin(angle) * 18,
      vx: Math.cos(angle) * spec.speed, vy: Math.sin(angle) * spec.speed, life: spec.range / spec.speed,
      damage: spec.damage, team: 'player', color: '#ffd77a', radius: 3 });
  }
  combat.effects.push({ x: player.x + Math.cos(base) * 22, y: player.y + Math.sin(base) * 22, life: 0.13, max: 0.13, color: '#fff0b1', type: 'muzzle' });
  return true;
}
export function firePolice(combat, policeCar, player) {
  const a = Math.atan2(player.y - policeCar.y, player.x - policeCar.x);
  combat.bullets.push({ x: policeCar.x + Math.cos(a) * 24, y: policeCar.y + Math.sin(a) * 24,
    vx: Math.cos(a) * 520, vy: Math.sin(a) * 520, life: 0.7, damage: 8, team: 'police', color: '#ff6b5c', radius: 3 });
  combat.effects.push({ x: policeCar.x + Math.cos(a) * 28, y: policeCar.y + Math.sin(a) * 28, life: 0.11, max: 0.11, color: '#ffc16c', type: 'muzzle' });
}
export function updateCombat(combat, player, pedestrians, police, world, dt, callbacks = {}) {
  for (const b of combat.bullets) {
    b.life -= dt; b.x += b.vx * dt; b.y += b.vy * dt;
    if (world.blockedAt(b.x, b.y, 2)) b.life = -1;
    if (b.team === 'player' && b.life > 0) {
      for (const p of pedestrians) {
        if (p.dead || p.hostile === false && p.health <= 0) continue;
        if (distanceSq(b.x, b.y, p.x, p.y) < (p.hostile ? 17 : 15) ** 2) {
          p.health -= b.damage; b.life = -1;
          callbacks.hit?.(p);
          if (p.health <= 0 && !p.dead) { p.dead = true; callbacks.downPed?.(p); }
          break;
        }
      }
      if (b.life > 0) for (const cop of police.units) {
        if (cop.health <= 0) continue;
        if (distanceSq(b.x, b.y, cop.x, cop.y) < 24 ** 2) {
          cop.health -= b.damage; b.life = -1;
          callbacks.hitCop?.(cop);
          if (cop.health <= 0) callbacks.downCop?.(cop);
          break;
        }
      }
    } else if (b.team === 'police' && b.life > 0 && distanceSq(b.x, b.y, player.x, player.y) < (player.vehicle ? 25 : 15) ** 2) {
      b.life = -1; callbacks.damagePlayer?.(b.damage);
    }
  }
  combat.bullets = combat.bullets.filter(b => b.life > 0);
  for (const e of combat.effects) e.life -= dt;
  combat.effects = combat.effects.filter(e => e.life > 0);
  for (const p of combat.pickups) p.life -= dt;
  combat.pickups = combat.pickups.filter(p => p.life > 0);
}
export function addPickup(combat, x, y, type = 'cash', value = 100) {
  combat.pickups.push({ x, y, type, value, life: 22, phase: Math.random() * 6.28 });
}
