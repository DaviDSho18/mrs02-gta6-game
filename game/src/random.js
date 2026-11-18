// A small seeded random number generator (mulberry32): the same seed gives the same city,
// traffic and screenshot scenes, which is what makes the screenshots repeatable. Also a few
// sampling helpers every module uses, so none of them reaches for Math.random.

export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh random source that borrows another one's stream, for bits that must not disturb it. */
export function derive(random) {
  return createRandom(Math.floor(random() * 4294967296));
}

export function range(random, lo, hi) {
  return lo + random() * (hi - lo);
}

export function int(random, lo, hi) {
  return lo + Math.floor(random() * (hi - lo + 1));
}

export function pick(random, list) {
  return list[Math.min(list.length - 1, Math.floor(random() * list.length))];
}

export function chance(random, p) {
  return random() < p;
}

export function clamp(value, lo, hi) {
  return value < lo ? lo : value > hi ? hi : value;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Turn an angle toward another by at most `max` radians, the short way round. */
export function turnToward(angle, target, max) {
  let delta = target - angle;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  if (delta > max) delta = max;
  else if (delta < -max) delta = -max;
  return angle + delta;
}

export function angleDiff(a, b) {
  let delta = b - a;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

export function distanceSq(ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  return dx * dx + dy * dy;
}
