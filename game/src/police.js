// Heat management and pursuing patrol cars. Stars are readable even at thumbnail size.
import { POLICE } from './config.js';
import { turnToward } from './random.js';
import { firePolice } from './combat.js';

export function createPolice() { return { stars: 0, heat: 0, lastCrime: -100, units: [], spawnClock: 0, escaped: 0, sirenPhase: 0 }; }
export function addCrime(police, amount = 1) {
  police.stars = Math.min(POLICE.maxStars, police.stars + amount);
  police.heat = Math.max(police.heat, 12 + police.stars * 4);
  police.lastCrime = 0; police.escaped = 0;
}
export function setWanted(police, stars) {
  police.stars = Math.max(0, Math.min(POLICE.maxStars, stars));
  police.heat = police.stars ? 24 : 0;
  police.units = [];
  police.spawnClock = 0;
}
function makeUnit(player, side) {
  const a = Math.atan2(player.y, player.x) + side * 1.9;
  return { x: player.x + Math.cos(a) * 660, y: player.y + Math.sin(a) * 660, angle: a + Math.PI,
    speed: 0, health: POLICE.unitHealth, fireClock: 0.8 + side * 0.1, blink: side * 0.3, siren: true, radius: 18 };
}
export function updatePolice(police, player, world, combat, dt, gameTime) {
  police.sirenPhase += dt;
  police.lastCrime += dt;
  if (police.stars > 0) {
    police.spawnClock -= dt;
    const desired = Math.min(6, police.stars + 1);
    while (police.units.length < desired && police.spawnClock <= 0) {
      police.units.push(makeUnit(player, police.units.length % 2 ? -1 : 1));
      police.spawnClock += 1.4;
    }
    let closest = Infinity;
    for (const cop of police.units) {
      if (cop.health <= 0) continue;
      const dx = player.x - cop.x, dy = player.y - cop.y;
      const d = Math.hypot(dx, dy); closest = Math.min(closest, d);
      const desiredAngle = Math.atan2(dy, dx);
      cop.angle = turnToward(cop.angle, desiredAngle, dt * (player.vehicle ? 1.65 : 2.3));
      const top = player.vehicle ? 320 : 250;
      cop.speed += (top - cop.speed) * Math.min(1, dt * 0.9);
      const ox = cop.x, oy = cop.y;
      cop.x += Math.cos(cop.angle) * cop.speed * dt;
      cop.y += Math.sin(cop.angle) * cop.speed * dt;
      if (world.blockedAt(cop.x, cop.y, 19)) {
        cop.x = ox; cop.y = oy; cop.angle += (Math.random() - 0.5) * 1.8;
        cop.speed *= 0.75;
      }
      const p = world.clamp(cop.x, cop.y); cop.x = p.x; cop.y = p.y;
      cop.fireClock -= dt;
      if (d < 410 && cop.fireClock <= 0) {
        firePolice(combat, cop, player);
        cop.fireClock = 1.05 + Math.random() * 0.55;
      }
      if (d < (player.vehicle ? 42 : 27) && cop.contactClock <= 0) {
        cop.contactClock = 1.2;
        player.health = Math.max(0, player.health - (player.vehicle ? 7 : 13));
      }
      cop.contactClock = Math.max(0, (cop.contactClock ?? 0) - dt);
    }
    police.units = police.units.filter(c => c.health > 0);
    if (police.lastCrime > POLICE.heatDecayDelay && closest > 580) police.escaped += dt;
    else police.escaped = 0;
    if (police.escaped > 11) {
      police.stars = Math.max(0, police.stars - 1);
      police.escaped = 0; police.heat = police.stars ? 16 : 0;
      if (police.stars === 0) police.units = [];
    }
  } else {
    police.units = [];
    police.escaped = 0;
  }
}
