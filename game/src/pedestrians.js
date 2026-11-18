// Civilian walkers with simple sidewalk wandering and a very visible flee response.
import { PED } from './config.js';
import { range, turnToward } from './random.js';

let nextId = 1;
const COLORS = ['#f3a982','#d9856a','#d3b071','#89b6b0','#ab91bc','#e5d8bc','#6f8d77','#df6f78'];
export function createPedestrians(world, random, player) {
  nextId = 1;
  const people = [];
  for (let i = 0; i < 38; i += 1) {
    const angle = random() * Math.PI * 2;
    const r = range(random, 120, 690);
    let x = player.x + Math.cos(angle) * r;
    let y = player.y + Math.sin(angle) * r;
    const p = world.clamp(x, y); x = p.x; y = p.y;
    const person = makePerson(random, x, y);
    world.resolveCircle(person, PED.radius + 2);
    people.push(person);
  }
  return people;
}
function makePerson(random, x, y, hostile = false) {
  return { id: nextId++, x, y, vx: 0, vy: 0, angle: random() * 6.28, health: hostile ? 58 : PED.health,
    color: hostile ? '#3d3546' : COLORS[Math.floor(random() * COLORS.length)], fleeing: 0,
    targetX: x + range(random, -120, 120), targetY: y + range(random, -120, 120),
    speed: hostile ? 44 : range(random, PED.walkSpeed * 0.65, PED.walkSpeed * 1.15), hostile, dead: false,
    fireCooldown: range(random, 0.2, 1.2), label: hostile ? 'Coquina crew' : '', };
}
export function spawnCrew(world, random, center) {
  const out = [];
  for (let i = 0; i < 4; i += 1) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    const p = { x: center.x + Math.cos(a) * 78, y: center.y + Math.sin(a) * 78 };
    world.resolveCircle(p, 14);
    out.push(makePerson(random, p.x, p.y, true));
  }
  return out;
}
export function panicNearby(people, x, y) {
  for (const p of people) if (!p.dead && Math.hypot(p.x - x, p.y - y) < PED.fleeRadius) p.fleeing = Math.max(p.fleeing, 4.5);
}
export function updatePedestrians(people, player, world, dt) {
  for (const p of people) {
    if (p.dead) continue;
    p.fleeing = Math.max(0, p.fleeing - dt);
    const d = Math.hypot(player.x - p.x, player.y - p.y);
    let tx = p.targetX, ty = p.targetY;
    if (p.fleeing > 0 || (player.vehicle && d < 120)) {
      const a = Math.atan2(p.y - player.y, p.x - player.x);
      tx = p.x + Math.cos(a) * 180; ty = p.y + Math.sin(a) * 180;
    } else if (Math.hypot(tx - p.x, ty - p.y) < 28) {
      p.targetX = p.x + range(Math.random, -170, 170); p.targetY = p.y + range(Math.random, -170, 170);
      tx = p.targetX; ty = p.targetY;
    }
    const desired = Math.atan2(ty - p.y, tx - p.x);
    p.angle = turnToward(p.angle, desired, dt * (p.fleeing ? 5 : 2.1));
    const sp = p.fleeing ? PED.fleeSpeed : p.speed;
    p.vx = Math.cos(p.angle) * sp; p.vy = Math.sin(p.angle) * sp;
    const oldX = p.x, oldY = p.y;
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (world.resolveCircle(p, PED.radius)) {
      p.x = oldX; p.y = oldY;
      p.angle += (Math.random() - 0.5) * 2.4;
      p.targetX = p.x + Math.cos(p.angle) * 100; p.targetY = p.y + Math.sin(p.angle) * 100;
    }
    const q = world.clamp(p.x, p.y); p.x = q.x; p.y = q.y;
    if (Math.hypot(p.x - player.x, p.y - player.y) > 1600 && people.length < 70) {
      p.x = player.x + (Math.random() - 0.5) * 700; p.y = player.y + (Math.random() - 0.5) * 700;
      const c = world.clamp(p.x, p.y); p.x = c.x; p.y = c.y;
      p.targetX = p.x + (Math.random() - 0.5) * 160; p.targetY = p.y + (Math.random() - 0.5) * 160;
    }
  }
}
export function aliveCrew(people) { return people.filter(p => p.hostile && !p.dead); }
