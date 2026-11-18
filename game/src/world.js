// The city of San Aurelio: a grid of blocks, avenues, sidewalks, parks, a marina and a beach.
// This module owns the geometry (roads, blocks, plot rectangles, water) and the solid buildings
// that cars and people collide with; it also knows each district, the named landmarks and the
// street label positions. It draws nothing (see city-art.js) and simulates nothing.
import { CITY, DISTRICTS, PALETTE, SIGNS } from './config.js';
import { pick, range } from './random.js';

export const LANDMARKS = {
  garage: { name: 'Palm Court Garage', district: 'Old Town' },
  docks: { name: 'Pier 9', district: 'Marina' },
  market: { name: 'Night Market', district: 'Sunset Strip' },
  tower: { name: 'Sol FM Tower', district: 'Sunset Strip' },
  casino: { name: 'Casa Miramar', district: 'Downtown' },
  marina: { name: 'Coquina Marina', district: 'Marina' },
  beach: { name: 'Aurelio Beach', district: 'The Beach' },
  plaza: { name: 'Plaza del Sol', district: 'Downtown' },
};

const BLOCK_WALLS = ['#d9b48f', '#cf9a83', '#e0c49a', '#b9c4b0', '#d6a7a0', '#c5b7c9', '#e4d3b0', '#a8b9c6'];
const ROOFS = ['#a8756a', '#8a6a5e', '#b48a72', '#7d8a76', '#9c7f8f'];

/** The x of the left edge of column `col`'s block. */
function blockX(col) {
  return CITY.road + col * (CITY.block + CITY.road);
}

/** The y of the top edge of row `row`'s block. */
function blockY(row) {
  return CITY.road + row * (CITY.block + CITY.road);
}

/** The road centreline x of north-south avenue index `n` (n = 0 is the west edge road). */
export function avenueX(n) {
  return blockX(n) - CITY.road / 2;
}

/** The road centreline y of east-west street index `n` (n = 0 is the north edge road). */
export function streetY(n) {
  return blockY(n) - CITY.road / 2;
}

/** A free-form call to the renderer when the world changes: the city painter listens for it. */
const listeners = new Set();

export function createWorld(random) {
  const world = {
    city: CITY,
    blocks: [],
    buildings: [],
    plots: [],
    walkRects: [],
    parks: [],
    labels: [],
    landmarks: {},
    lanePath: [],
    water: { x: 99999, y: 0, w: 0, h: 0 },
    signs: [],
    seed: 0,
  };

  const totalW = CITY.road * 2 + CITY.cols * CITY.block + (CITY.cols - 1) * CITY.road;
  const totalH = CITY.road * 2 + CITY.rows * CITY.block + (CITY.rows - 1) * CITY.road;
  world.width = totalW;
  world.height = totalH + CITY.beach;
  world.ocean = CITY.ocean;
  world.water = { x: totalW + CITY.beach, y: 0, w: CITY.ocean, h: world.height };

  const districtAt = (col, row) => {
    if (col === CITY.cols - 1) {
      if (row >= 6 && row <= 9) return 'Marina';
      if (row >= 3 && row <= 5) return 'Las Palmas';
      return 'The Beach';
    }
    if (row <= 1 && col <= 5) return 'Las Palmas';
    if (row <= 1) return 'Midtown';
    if (row === 2 || row === 3) return col <= 4 ? 'Midtown' : 'Old Town';
    if (row <= 5) return col <= 4 ? 'Midtown' : 'Sunset Strip';
    if (row <= 8) return col >= 8 ? 'Marina' : 'Downtown';
    return col <= 4 ? 'Midtown' : 'Las Palmas';
  };

  // Which blocks are special, by [col, row].
  const special = new Map();
  const mark = (col, row, kind, landmark) => special.set(`${col},${row}`, { kind, landmark });

  // The layout of our city: a palm-lined grid with a beach in the east and a marina on the water.
  mark(8, 5, 'garage', 'garage'); // Palm Court
  mark(10, 8, 'docks', 'docks'); // Pier 9
  mark(7, 3, 'market', 'market'); // Night Market
  mark(9, 2, 'tower', 'tower'); // Sol FM Tower
  mark(6, 9, 'casino', 'casino'); // Casa Miramar
  mark(11, 6, 'marina', 'marina'); // Coquina Marina
  mark(5, 4, 'plaza', 'plaza'); // Plaza del Sol
  mark(2, 6, 'park', 'park');
  mark(4, 9, 'park', 'park');
  mark(7, 0, 'park', 'park');
  mark(0, 3, 'park', 'park');
  mark(1, 10, 'park', 'park');
  mark(6, 6, 'park', 'park');

  const blockOf = (col, row) => {
    const x = blockX(col);
    const y = blockY(row);
    const spec = special.get(`${col},${row}`);
    const block = {
      col,
      row,
      x,
      y,
      w: CITY.block,
      h: CITY.block,
      district: districtAt(col, row),
      kind: spec?.kind ?? 'city',
      landmark: spec?.landmark ?? null,
      index: world.blocks.length,
    };
    world.blocks.push(block);
    return block;
  };

  function addBuilding(rect, extra) {
    const building = {
      x: rect.x,
      y: rect.y,
      w: rect.w,
      h: rect.h,
      wall: pick(random, BLOCK_WALLS),
      roof: pick(random, ROOFS),
      floors: 1 + Math.floor(random() * 4),
      windows: [],
      awning: random() < 0.4,
      awningColor: pick(random, ['#c05a4c', '#3f7f74', '#c99a4a', '#7a5c8f']),
      ...extra,
    };
    world.buildings.push(building);
    return building;
  }

  /** A building's windows, as little lit rectangles on its face (baked once, not every frame). */
  function glaze(building) {
    const stepX = 26;
    const stepY = 22;
    for (let x = building.x + 9; x < building.x + building.w - 12; x += stepX) {
      for (let y = building.y + 9; y < building.y + building.h - 12; y += stepY) {
        if (random() < 0.45) continue;
        building.windows.push({ x, y, w: 11, h: 8, lit: random() < 0.7 });
      }
    }
  }

  function fillPlots(block, inset, kinds) {
    // A block holds four lots (2x2), each with a few buildings, so streets read as dense and
    // walkable but every building has a doorway worth using.
    const halfW = block.w / 2;
    const halfH = block.h / 2;
    let placed = 0;
    for (let qy = 0; qy < 2; qy += 1) {
      for (let qx = 0; qx < 2; qx += 1) {
        const inner = 6 + Math.floor(random() * 8);
        const lotX = block.x + qx * halfW + inner;
        const lotY = block.y + qy * halfH + inner;
        const lotW = halfW - inner * 2;
        const lotH = halfH - inner * 2;
        const colspan = random() < 0.35 ? 2 : 1;
        const rowspan = random() < 0.25 && colspan === 1 ? 2 : 1;
        const count = colspan === 2 || rowspan === 2 ? 1 : random() < 0.55 ? 2 : 1;
        const gap = 8;
        if (count === 1) {
          const r = {
            x: lotX,
            y: lotY,
            w: colspan === 2 ? lotW * 2 + gap : lotW,
            h: rowspan === 2 ? lotH * 2 + gap : lotH,
          };
          addBuilding(r);
          placed += 1;
        } else if (random() < 0.5) {
          const w = (lotW - gap) / 2;
          addBuilding({ x: lotX, y: lotY, w, h: lotH });
          addBuilding({ x: lotX + w + gap, y: lotY, w, h: lotH });
          placed += 2;
        } else {
          const h = (lotH - gap) / 2;
          addBuilding({ x: lotX, y: lotY, w: lotW, h });
          addBuilding({ x: lotX, y: lotY + h + gap, w: lotW, h });
          placed += 2;
        }
      }
    }
    // The block's sidewalk ring, and the walkable pockets between buildings.
    world.walkRects.push({ x: block.x - inset, y: block.y - inset, w: block.w + inset * 2, h: block.h + inset * 2, kind: 'sidewalk', block });
    world.walkRects.push({ x: block.x, y: block.y, w: block.w, h: block.h, kind: kinds, block });
    return placed;
  }

  function plantParks(block) {
    const park = { block, trees: [], bushes: [], benches: [], grass: true };
    const count = 6 + Math.floor(random() * 5);
    for (let i = 0; i < count; i += 1) {
      park.trees.push({
        x: block.x + range(random, 28, block.w - 28),
        y: block.y + range(random, 28, block.h - 28),
        r: range(random, 15, 24),
        sway: random() * Math.PI * 2,
      });
    }
    for (let i = 0; i < 6; i += 1) {
      park.bushes.push({
        x: block.x + range(random, 20, block.w - 20),
        y: block.y + range(random, 20, block.h - 20),
        r: range(random, 7, 13),
      });
    }
    for (let i = 0; i < 3; i += 1) {
      park.benches.push({ x: block.x + range(random, 40, block.w - 40), y: block.y + range(random, 40, block.h - 40), a: random() * Math.PI });
    }
    world.parks.push(park);
    world.walkRects.push({ x: block.x - 24, y: block.y - 24, w: block.w + 48, h: block.h + 48, kind: 'sidewalk', block });
    world.walkRects.push({ x: block.x, y: block.y, w: block.w, h: block.h, kind: 'park', block });
    // A fountain or a bandstand in the middle so the park reads as designed, not random.
    const center = { x: block.x + block.w / 2, y: block.y + block.h / 2, w: 42, h: 42 };
    park.fountain = center;
    world.buildings.push({ ...center, x: center.x - 21, y: center.y - 21, wall: '#c9bda6', roof: '#8ec4c0', floors: 1, windows: [], fountain: true });
  }

  function plantPlaza(block) {
    world.walkRects.push({ x: block.x - 24, y: block.y - 24, w: block.w + 48, h: block.h + 48, kind: 'sidewalk', block });
    world.walkRects.push({ x: block.x, y: block.y, w: block.w, h: block.h, kind: 'plaza', block });
    world.parks.push({ block, trees: [], bushes: [], benches: [], plaza: true, fountain: { x: block.x + block.w / 2, y: block.y + block.h / 2, w: 60, h: 60 } });
    // The plaza's obelisk.
    addBuilding({ x: block.x + block.w / 2 - 16, y: block.y + block.h / 2 - 16, w: 32, h: 32 }, { memorial: true, floors: 2 });
  }

  function plantDocks(block) {
    world.walkRects.push({ x: block.x - 24, y: block.y - 24, w: block.w + 48, h: block.h + 48, kind: 'sidewalk', block });
    world.walkRects.push({ x: block.x, y: block.y, w: block.w, h: block.h, kind: 'docks', block });
    // Cargo: containers and a warehouse, plus a lot of room to park a stolen car.
    addBuilding({ x: block.x + 14, y: block.y + 14, w: 150, h: 86 }, { wall: '#7f8c8d', roof: '#5d6b6b', floors: 1, container: true });
    addBuilding({ x: block.x + 182, y: block.y + 14, w: 100, h: 60 }, { wall: '#8a7a6a', roof: '#66584c', floors: 1, container: true });
    addBuilding({ x: block.x + 14, y: block.y + 190, w: 90, h: 92 }, { wall: '#9b7e63', roof: '#5f4d3d', floors: 1, warehouse: true });
    for (const color of ['#b8563f', '#3c6e8a', '#c9a13c']) {
      addBuilding({ x: block.x + range(random, 130, 240), y: block.y + range(random, 110, 230), w: range(random, 40, 58), h: range(random, 30, 44) }, { wall: color, roof: color, floors: 1, crate: true });
    }
  }

  function placeLandmark(block, landmarkId) {
    const lm = LANDMARKS[landmarkId];
    if (!lm) return;
    world.landmarks[landmarkId] = {
      ...lm,
      id: landmarkId,
      x: block.x + block.w / 2,
      y: block.y + block.h / 2,
      block,
    };
    block.landmarkId = landmarkId;
  }

  // ---- build every block
  for (let row = 0; row < CITY.rows; row += 1) {
    for (let col = 0; col < CITY.cols; col += 1) {
      const block = blockOf(col, row);
      if (block.kind === 'park') {
        plantParks(block);
      } else if (block.kind === 'plaza') {
        plantPlaza(block);
      } else if (block.kind === 'docks') {
        plantDocks(block);
      } else if (block.kind === 'marina') {
        plantParks(block);
        // The marina office plus a big open lot (the marina is where the first car waits).
        addBuilding({ x: block.x + 12, y: block.y + 12, w: 92, h: 70 }, { wall: '#e8ddc8', roof: '#b7614f', floors: 2, awning: true, awningColor: '#3f7f74' });
      } else if (block.kind === 'tower') {
        plantParks(block);
        addBuilding({ x: block.x + 70, y: block.y + 70, w: 160, h: 160 }, { wall: '#c9c2b5', roof: '#7e6e62', floors: 5, tower: true });
      } else if (block.kind === 'garage') {
        addBuilding({ x: block.x + 10, y: block.y + 10, w: 118, h: 130 }, { wall: '#4b6f6a', roof: '#32524f', floors: 1, garage: true, windows: [] });
        addBuilding({ x: block.x + 160, y: block.y + 10, w: 128, h: 92 }, { wall: '#c9a887', roof: '#9c7a5e', floors: 2 });
        addBuilding({ x: block.x + 160, y: block.y + 130, w: 100, h: 100 }, { wall: '#b9aea0', roof: '#86766a', floors: 1 });
        world.walkRects.push({ x: block.x - 24, y: block.y - 24, w: block.w + 48, h: block.h + 48, kind: 'sidewalk', block });
        world.walkRects.push({ x: block.x, y: block.y, w: block.w, h: block.h, kind: 'garage-lot', block });
      } else if (block.kind === 'casino') {
        addBuilding({ x: block.x + 10, y: block.y + 10, w: 180, h: 170 }, { wall: '#c9a13c', roof: '#8f6d28', floors: 4, casino: true, awning: true, awningColor: '#b7614f' });
        addBuilding({ x: block.x + 214, y: block.y + 10, w: 76, h: 80 }, { wall: '#d8cbb0', roof: '#a8855f', floors: 2 });
        addBuilding({ x: block.x + 214, y: block.y + 110, w: 76, h: 180 }, { wall: '#b7c0bf', roof: '#7d8a8a', floors: 3 });
        world.walkRects.push({ x: block.x - 24, y: block.y - 24, w: block.w + 48, h: block.h + 48, kind: 'sidewalk', block });
        world.walkRects.push({ x: block.x, y: block.y, w: block.w, h: block.h, kind: 'casino-lot', block });
      } else if (block.kind === 'market') {
        plantParks(block);
        for (let i = 0; i < 5; i += 1) {
          addBuilding({ x: block.x + 24 + i * 52, y: block.y + 24, w: 38, h: 32 }, { wall: pick(random, ['#d96b52', '#4f9a8c', '#e0b04a']), roof: '#f1e6cf', floors: 1, stall: true });
        }
      } else {
        const inset = 24;
        fillPlots(block, inset, 'pavement');
      }
      if (block.landmark) placeLandmark(block, block.landmark);
    }
  }

  // Mark the remaining walkable pavement around the beach strip at the east edge.
  const beachBlock = { x: totalW, y: 0, w: CITY.beach, h: totalH };
  world.beach = beachBlock;
  world.walkRects.push({ x: totalW, y: 0, w: CITY.beach, h: totalH, kind: 'beach', block: null });
  world.walkRects.push({ x: totalW, y: totalH, w: CITY.beach, h: CITY.beach + 40, kind: 'beach', block: null });

  for (const building of world.buildings) if (!building.fountain && !building.stall && !building.memorial) glaze(building);

  // ---- street labels, for the minimap and the world's edges
  for (let row = 0; row <= CITY.rows; row += 1) {
    world.labels.push({ x: avenueX(0) + 40, y: streetY(row), text: '', kind: 'street', horizontal: true });
  }
  for (let row = 0; row < CITY.rows; row += 1) {
    world.labels.push({ x: averageAvX() , y: streetY(row), text: '', kind: 'street-name' });
  }
  for (let col = 0; col <= CITY.cols; col += 1) {
    world.labels.push({ x: avenueX(col), y: 0, text: '', kind: 'avenue', vertical: true });
  }

  function averageAvX() {
    return (avenueX(0) + avenueX(CITY.cols)) / 2;
  }

  // ---- the traffic lane graph: a loop around the outside plus one inside each block ring
  buildLanePath();

  function buildLanePath() {
    // Cars follow a loop roughly 34 px left of the road's centreline; we build one closed loop
    // for the outer ring and smaller rectangles for each interior street, merged into one path
    // list of waypoints that vehicles can be seeded onto anywhere.
    const waypoints = [];
    const push = (x, y) => waypoints.push({ x, y });
    const inset = 34;
    // Outer ring, clockwise.
    const x0 = avenueX(0) - inset;
    const x1 = avenueX(CITY.cols) + inset;
    const y0 = streetY(0) - inset;
    const y1 = streetY(CITY.rows) + inset;
    push(x0, y0);
    push(x1, y0);
    push(x1, y1);
    push(x0, y1);
    world.outerLoop = waypoints.slice();
    world.lanePath = waypoints;
  }

  /** The hub positions, resolved once so missions and the minimap can point at them. */
  world.hub = {
    start: { x: blockX(4) + 120, y: blockY(7) + 150 },
    garage: world.landmarks.garage ? { x: world.landmarks.garage.x, y: world.landmarks.garage.y } : { x: 2000, y: 2000 },
  };

  /** Nearest landmark by id. */
  world.landmark = (id) => world.landmarks[id] ?? null;

  /** Whether a point is in the ocean (blocked for everyone). */
  world.isWater = (x, y) => x > world.water.x || y > world.height;

  /** Clamp a position into the world's playable bounds. */
  world.clamp = (x, y) => ({
    x: Math.max(8, Math.min(world.water.x - 8, x)),
    y: Math.max(8, Math.min(world.height - 8, y)),
  });

  /** Push a circle of `radius` out of every solid building it overlaps; returns true when moved. */
  world.resolveCircle = (pos, radius) => {
    let hit = false;
    for (let i = 0; i < world.buildings.length; i += 1) {
      const b = world.buildings[i];
      const nx = Math.max(b.x, Math.min(pos.x, b.x + b.w));
      const ny = Math.max(b.y, Math.min(pos.y, b.y + b.h));
      let dx = pos.x - nx;
      let dy = pos.y - ny;
      const d2 = dx * dx + dy * dy;
      if (d2 >= radius * radius) continue;
      if (d2 > 1e-6) {
        const d = Math.sqrt(d2);
        const push = radius - d;
        pos.x += (dx / d) * push;
        pos.y += (dy / d) * push;
      } else {
        // Centre inside the box: push out the shortest way.
        const left = pos.x - b.x;
        const right = b.x + b.w - pos.x;
        const top = pos.y - b.y;
        const bottom = b.y + b.h - pos.y;
        const m = Math.min(left, right, top, bottom);
        if (m === left) pos.x = b.x - radius;
        else if (m === right) pos.x = b.x + b.w + radius;
        else if (m === top) pos.y = b.y - radius;
        else pos.y = b.y + b.h + radius;
      }
      hit = true;
    }
    return hit;
  };

  /** Whether a circle centred at (x, y) overlaps a solid building. */
  world.blockedAt = (x, y, radius) => {
    for (let i = 0; i < world.buildings.length; i += 1) {
      const b = world.buildings[i];
      if (x + radius > b.x && x - radius < b.x + b.w && y + radius > b.y && y - radius < b.y + b.h) return true;
    }
    return false;
  };

  /** The nearest point on the nearest road centreline to (x, y): used to respawn and to steer traffic. */
  world.nearestRoadPoint = (x, y) => {
    const col = Math.round((x - CITY.road / 2) / (CITY.block + CITY.road));
    const row = Math.round((y - CITY.road / 2) / (CITY.block + CITY.road));
    const cx = Math.max(0, Math.min(CITY.cols, col));
    const cy = Math.max(0, Math.min(CITY.rows, row));
    const axX = avenueX(cx);
    const stY = streetY(cy);
    if (Math.abs(x - axX) < Math.abs(y - stY)) return { x: axX, y, onAvenue: true, index: cx };
    return { x, y: stY, onAvenue: false, index: cy };
  };

  /** Build the district label list for the map screen. */
  world.districtLabels = Object.keys(DISTRICTS).map((name) => ({ name, sub: DISTRICTS[name] }));

  /** Totals other modules size their pools from. */
  world.spawnPoint = world.hub.start;
  world.sidewalkRects = world.walkRects;

  return world;
}

export const streetYExport = streetY;
export const blockXY = (col, row) => ({ x: blockX(col), y: blockY(row) });
