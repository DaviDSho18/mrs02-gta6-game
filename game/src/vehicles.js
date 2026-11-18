// Traffic, parked cars and arcade-feel vehicle physics.
import { CITY, VEHICLE_KINDS } from './config.js';
import { pick, range, turnToward } from './random.js';

const ROAD_STEP = CITY.block + CITY.road;
const avenueX = (n) => CITY.road / 2 + n * ROAD_STEP;
const streetY = (n) => CITY.road / 2 + n * ROAD_STEP;
let nextId = 1;

function makeCar(random, x, y, options = {}) {
  const kind = options.kind ?? pick(random, VEHICLE_KINDS);
  return {
    id: nextId++, kind, x, y, angle: options.angle ?? 0, speed: 0,
    color: options.color ?? pick(random, kind.colors), health: 100,
    traffic: !!options.traffic, parked: !!options.parked, axis: options.axis ?? 'h',
    lane: options.lane ?? y, dir: options.dir ?? 1, cooldown: 0,
    maxSpeed: kind.maxSpeed, accel: kind.accel, grip: kind.grip,
    occupied: false, stolen: false, tag: options.tag ?? '',
  };
}

export function createVehicles(world, random, start) {
  nextId = 1;
  const cars = [];
  const marina = world.landmark('marina').block;
  cars.push(makeCar(random, marina.x + 225, marina.y + 228, { parked: true, angle: -Math.PI / 2, color: '#e8a94b', tag: 'Marina Lot' }));
  // Side streets in the starting district have enough moving traffic to make the city feel alive.
  for (let i = 0; i < 22; i += 1) {
    const axis = random() < 0.58 ? 'h' : 'v';
    const laneIndex = Math.max(0, Math.min(12, Math.round((axis === 'h' ? start.y : start.x) / ROAD_STEP) + Math.floor(range(random, -2.2, 2.3))));
    const lane = (axis === 'h' ? streetY(laneIndex) : avenueX(laneIndex)) + (random() < 0.5 ? -19 : 19);
    const coordinate = (axis === 'h' ? start.x : start.y) + range(random, -1050, 1050);
    const dir = random() < 0.5 ? -1 : 1;
    const x = axis === 'h' ? Math.max(120, Math.min(world.width - 120, coordinate)) : lane;
    const y = axis === 'h' ? lane : Math.max(120, Math.min(world.height - 120, coordinate));
    cars.push(makeCar(random, x, y, { traffic: true, axis, lane, dir, angle: axis === 'h' ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2) }));
  }
  // A few parked cars at other landmarks reward exploring and provide mission options.
  for (const lm of ['garage', 'market', 'casino']) {
    const p = world.landmark(lm);
    cars.push(makeCar(random, p.x + 96, p.y + 93, { parked: true, angle: Math.PI / 2, color: pick(random, ['#62a9a5', '#d95f50', '#ede6d6']) }));
  }
  return cars;
}

export function addParkedCar(cars, random, x, y, color = '#4f9eaa') {
  const car = makeCar(random, x, y, { parked: true, color, angle: Math.PI / 2 });
  cars.push(car);
  return car;
}

export function drivePlayerCar(car, player, input, world, dt) {
  const throttle = (input.held('KeyW') || input.held('ArrowUp') ? 1 : 0) - (input.held('KeyS') || input.held('ArrowDown') ? 1 : 0);
  const steer = (input.held('KeyD') || input.held('ArrowRight') ? 1 : 0) - (input.held('KeyA') || input.held('ArrowLeft') ? 1 : 0);
  const handbrake = input.held('Space');
  const max = car.maxSpeed * (handbrake ? 0.62 : 1);
  car.speed += throttle * car.accel * dt;
  car.speed *= Math.exp(-(throttle ? 0.28 : 1.05) * dt);
  car.speed = Math.max(-max * 0.38, Math.min(max, car.speed));
  const traction = Math.min(1, Math.abs(car.speed) / 100 + 0.18);
  car.angle += steer * car.grip * traction * dt * (car.speed >= 0 ? 1 : -1);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (world.blockedAt(nx, ny, 18)) {
    car.speed *= -0.22;
    car.angle += steer === 0 ? (Math.random() - 0.5) * 0.8 : steer * 0.35;
    player.health = Math.max(0, player.health - Math.min(5, Math.abs(car.speed) * 0.012));
  } else {
    car.x = nx; car.y = ny;
  }
  const clipped = world.clamp(car.x, car.y);
  car.x = clipped.x; car.y = clipped.y;
  player.x = car.x; player.y = car.y; player.angle = car.angle;
}

export function updateVehicles(cars, player, input, world, dt) {
  for (const car of cars) {
    if (car === player.vehicle) {
      drivePlayerCar(car, player, input, world, dt);
      continue;
    }
    if (car.traffic) {
      const v = range(car.random ?? Math.random, 0, 0); // no draw; keep traffic speed deterministic below
      void v;
      const speed = car.cruiseSpeed ?? (car.cruiseSpeed = 90 + ((car.id * 47) % 58));
      if (car.axis === 'h') {
        car.x += car.dir * speed * dt;
        car.y = car.lane;
        if (car.x > world.width + 100) car.x = -100;
        if (car.x < -100) car.x = world.width + 100;
      } else {
        car.y += car.dir * speed * dt;
        car.x = car.lane;
        if (car.y > world.height + 100) car.y = -100;
        if (car.y < -100) car.y = world.height + 100;
      }
      car.angle = car.axis === 'h' ? (car.dir > 0 ? 0 : Math.PI) : (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2);
    }
  }
  // Keep a few civilian cars near the player as the camera moves into another district.
  const near = cars.filter(c => c.traffic && Math.hypot(c.x - player.x, c.y - player.y) < 950).length;
  if (near < 5 && cars.length < 50) {
    const axis = Math.random() < 0.5 ? 'h' : 'v';
    const index = Math.max(0, Math.min(12, Math.round((axis === 'h' ? player.y : player.x) / ROAD_STEP)));
    const lane = (axis === 'h' ? streetY(index) : avenueX(index)) + (Math.random() < 0.5 ? -18 : 18);
    const dir = Math.random() < 0.5 ? -1 : 1;
    const x = axis === 'h' ? player.x + (Math.random() < 0.5 ? -800 : 800) : lane;
    const y = axis === 'h' ? lane : player.y + (Math.random() < 0.5 ? -800 : 800);
    cars.push(makeCar(Math.random, Math.max(40, Math.min(world.width - 40, x)), Math.max(40, Math.min(world.height - 40, y)), { traffic: true, axis, lane, dir, angle: axis === 'h' ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2) }));
  }
}

export function nearestCar(cars, x, y, maxDistance = 72) {
  let best = null; let bestD = maxDistance;
  for (const car of cars) {
    if (car === null || car.occupied || car.health <= 0) continue;
    const d = Math.hypot(car.x - x, car.y - y);
    if (d < bestD) { best = car; bestD = d; }
  }
  return best;
}

export function turnCarToward(car, tx, ty, amount) {
  const desired = Math.atan2(ty - car.y, tx - car.x);
  car.angle = turnToward(car.angle, desired, amount);
}
