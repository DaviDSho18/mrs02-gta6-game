// Paints San Aurelio: the asphalt grid, lane paint, crosswalks, sidewalks with paving, parks,
// the beach, the ocean, and every building with its long golden-hour shadow. Also bakes the
// minimap image once, so the HUD can draw a whole city map without touching thousands of
// rectangles a frame. Buildings, palms and lamps are culled to the camera's view.
import { CITY, PALETTE } from './config.js';
import { createRandom } from './random.js';
import { shade, withAlpha } from './render.js';

const PALMS = [];
const palmWorlds = new WeakSet();

export function createCityArt(world, painter) {
  const random = createRandom(90210);
  const patterns = makePatterns(painter.ctx);

  // ---- roadside palms at every block corner, plus lamps along the avenues
  if (!palmWorlds.has(world)) {
    for (const block of world.blocks) {
      const corners = [
        { x: block.x - 10, y: block.y - 10 },
        { x: block.x + block.w + 10, y: block.y - 10 },
        { x: block.x - 10, y: block.y + block.h + 10 },
        { x: block.x + block.w + 10, y: block.y + block.h + 10 },
      ];
      for (const c of corners) PALMS.push({ x: c.x, y: c.y, r: 18 + random() * 6, sway: random() * Math.PI * 2, lamp: false });
      if (block.row % 2 === 0) PALMS.push({ x: block.x + block.w / 2, y: block.y - 12, r: 15 + random() * 4, sway: random() * Math.PI * 2, lamp: false });
      PALMS.push({ x: block.x - 14, y: block.y + block.h + 14, r: 0, sway: 0, lamp: true });
      PALMS.push({ x: block.x + block.w + 14, y: block.y + block.h + 14, r: 0, sway: 0, lamp: true });
    }
    palmWorlds.add(world);
  }

  // ---- beach props: umbrellas, towels, lifeguard tower
  const beach = world.beach;
  const umbrellas = [];
  for (let i = 0; i < 26; i += 1) {
    umbrellas.push({
      x: beach.x + 40 + random() * (beach.w - 90),
      y: 200 + random() * (CITY.rows * (CITY.block + CITY.road)),
      color: ['#e2554e', '#2d8f9b', '#f5c451', '#c9a1c0'][Math.floor(random() * 4)],
      r: 16 + random() * 7,
    });
  }

  // ---- marina boats out on the water
  const boats = [];
  for (let i = 0; i < 9; i += 1) {
    boats.push({
      x: world.water.x + 60 + random() * 260,
      y: 700 + random() * 3600,
      len: 44 + random() * 46,
      wid: 16 + random() * 10,
      color: ['#f2eee2', '#e8d9c0', '#8fb9bd', '#d9a08a'][Math.floor(random() * 4)],
      angle: Math.PI / 2 + (random() - 0.5) * 0.12,
    });
  }

  // ---- landmark signage, placed beside each special block
  const signs = [];
  const signText = {
    garage: { text: 'PALM COURT', sub: 'GARAGE', color: PALETTE.neonTeal },
    docks: { text: 'PIER 9', sub: 'COQUINA DOCKS', color: PALETTE.gold },
    market: { text: 'NIGHT MARKET', sub: 'OPEN LATE', color: '#b9f18d' },
    tower: { text: 'SOL FM', sub: '88.3 RADIO TOWER', color: PALETTE.neonPink },
    casino: { text: 'CASA MIRAMAR', sub: 'CASINO', color: '#ffd166' },
    marina: { text: 'MARINA', sub: 'PIER 4', color: '#9fd0d6' },
    plaza: { text: 'PLAZA', sub: 'DEL SOL', color: '#f1e6cf' },
  };
  for (const block of world.blocks) {
    const sign = signText[block.landmark];
    if (!sign) continue;
    signs.push({ x: block.x + block.w / 2, y: block.y + block.h + 42, ...sign });
  }

  const minimap = bakeMinimap(world);
  const mapScreen = bakeMapScreen(world);

  function drawRoads(cam) {
    const ctx = painter.ctx;
    const view = cam.viewRect(140);
    const road = CITY.road;
    ctx.fillStyle = patterns.asphalt;
    // Horizontal avenues.
    for (let row = 0; row <= CITY.rows; row += 1) {
      const y = streetY(world, row) - road / 2;
      if (y + road < view.y || y > view.y + view.h) continue;
      ctx.fillRect(view.x, y, view.w, road);
    }
    // Vertical avenues (they overlap the intersections: fine, asphalt on asphalt).
    for (let col = 0; col <= CITY.cols; col += 1) {
      const x = avenueX(world, col) - road / 2;
      if (x + road < view.x || x > view.x + view.w) continue;
      ctx.fillRect(x, view.y, road, view.h);
    }

    // Lane paint: dashed centre lines.
    ctx.strokeStyle = PALETTE.lane;
    ctx.lineWidth = 2.5;
    ctx.setLineDash([26, 22]);
    ctx.globalAlpha = 0.55;
    for (let row = 0; row <= CITY.rows; row += 1) {
      const y = streetY(world, row);
      if (y < view.y || y > view.y + view.h) continue;
      ctx.beginPath();
      ctx.moveTo(view.x, y);
      ctx.lineTo(view.x + view.w, y);
      ctx.stroke();
    }
    for (let col = 0; col <= CITY.cols; col += 1) {
      const x = avenueX(world, col);
      if (x < view.x || x > view.x + view.w) continue;
      ctx.beginPath();
      ctx.moveTo(x, view.y);
      ctx.lineTo(x, view.y + view.h);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;

    // Curbs: a warm stone edge around every intersection arm.
    const firstCol = Math.max(0, Math.floor((view.x - 300) / (CITY.block + CITY.road)));
    const lastCol = Math.min(CITY.cols - 1, Math.ceil((view.x + view.w) / (CITY.block + CITY.road)));
    const firstRow = Math.max(0, Math.floor((view.y - 300) / (CITY.block + CITY.road)));
    const lastRow = Math.min(CITY.rows - 1, Math.ceil((view.y + view.h) / (CITY.block + CITY.road)));
    for (let row = firstRow; row <= lastRow; row += 1) {
      for (let col = firstCol; col <= lastCol; col += 1) {
        const b = world.blocks[row * CITY.cols + col];
        if (!b) continue;
        drawCrosswalks(ctx, b, road);
      }
    }
  }

  function drawCrosswalks(ctx, block, road) {
    // Zebra crossings on all four sides of the block.
    const stripe = 8;
    const gap = 7;
    const length = Math.min(56, block.w / 2);
    ctx.fillStyle = PALETTE.crosswalk;
    ctx.globalAlpha = 0.2;
    const drawBand = (x, y, w, h, horizontal) => {
      const count = Math.floor((horizontal ? w : h) / (stripe + gap));
      for (let i = 0; i < count; i += 1) {
        if (horizontal) ctx.fillRect(x + i * (stripe + gap), y, stripe, h);
        else ctx.fillRect(x, y + i * (stripe + gap), w, stripe);
      }
    };
    const inset = 8;
    drawBand(block.x + 10, block.y - road + inset, length, road - inset * 2, true);
    drawBand(block.x + block.w - length - 10, block.y + block.h + inset, length, road - inset * 2, true);
    drawBand(block.x - road + inset, block.y + 10, road - inset * 2, length, false);
    drawBand(block.x + block.w + inset, block.y + block.h - length - 10, road - inset * 2, length, false);
    ctx.globalAlpha = 1;
  }

  function drawBlocks(cam) {
    const ctx = painter.ctx;
    const view = cam.viewRect(160);
    for (const block of world.blocks) {
      if (block.x + block.w + 60 < view.x || block.x - 60 > view.x + view.w) continue;
      if (block.y + block.h + 60 < view.y || block.y - 60 > view.y + view.h) continue;
      // Sidewalk band around the block.
      ctx.fillStyle = patterns.sidewalk;
      ctx.fillRect(block.x - 24, block.y - 24, block.w + 48, block.h + 48);
      // A darker curb line hugging the road, so the sidewalk reads as raised.
      ctx.strokeStyle = PALETTE.curb;
      ctx.lineWidth = 3;
      ctx.strokeRect(block.x - 25.5, block.y - 25.5, block.w + 51, block.h + 51);
      ctx.strokeStyle = 'rgba(255, 244, 214, 0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(block.x - 21.5, block.y - 21.5, block.w + 43, block.h + 43);

      if (block.kind === 'park') {
        ctx.fillStyle = patterns.grass;
        ctx.fillRect(block.x, block.y, block.w, block.h);
        drawParkDetails(ctx, block);
      } else if (block.kind === 'plaza') {
        ctx.fillStyle = patterns.plaza;
        ctx.fillRect(block.x, block.y, block.w, block.h);
      } else if (block.kind === 'beach' || block.kind === 'docks') {
        ctx.fillStyle = patterns.asphaltDark;
        ctx.fillRect(block.x, block.y, block.w, block.h);
        ctx.strokeStyle = 'rgba(245, 214, 122, 0.35)';
        ctx.lineWidth = 3;
        ctx.setLineDash([14, 12]);
        ctx.strokeRect(block.x + 12, block.y + 12, block.w - 24, block.h - 24);
        ctx.setLineDash([]);
      } else if (block.kind === 'garage' || block.kind === 'casino') {
        ctx.fillStyle = patterns.parking;
        ctx.fillRect(block.x, block.y, block.w, block.h);
        drawParkingLines(ctx, block);
      } else if (block.kind === 'marina') {
        ctx.fillStyle = patterns.parking;
        ctx.fillRect(block.x, block.y, block.w, block.h);
      } else {
        // A city block's inner plot: raked concrete between the buildings.
        ctx.fillStyle = PALETTE.plot;
        ctx.fillRect(block.x, block.y, block.w, block.h);
        ctx.fillStyle = 'rgba(255, 246, 222, 0.18)';
        ctx.fillRect(block.x + 4, block.y + 4, block.w - 8, 3);
      }
    }
  }

  function drawParkingLines(ctx, block) {
    ctx.strokeStyle = 'rgba(240, 232, 205, 0.4)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i += 1) {
      const x = block.x + 26 + i * 26;
      ctx.beginPath();
      ctx.moveTo(x, block.y + block.h - 70);
      ctx.lineTo(x, block.y + block.h - 12);
      ctx.stroke();
    }
    for (let i = 0; i < 3; i += 1) {
      const y = block.y + 20 + i * 24;
      ctx.beginPath();
      ctx.moveTo(block.x + block.w - 100, y);
      ctx.lineTo(block.x + block.w - 12, y);
      ctx.stroke();
    }
  }

  function drawParkDetails(ctx, block) {
    for (const park of world.parks) {
      if (park.block !== block) continue;
      for (const bench of park.benches) {
        ctx.fillStyle = '#8a6244';
        ctx.fillRect(bench.x - 13, bench.y - 4, 26, 8);
        ctx.fillStyle = 'rgba(255, 240, 210, 0.22)';
        ctx.fillRect(bench.x - 13, bench.y - 4, 26, 2);
      }
      const fountain = park.fountain;
      if (fountain) {
        ctx.fillStyle = '#b9b09a';
        ctx.beginPath();
        ctx.arc(block.x + block.w / 2, block.y + block.h / 2, 38, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#67b8bd';
        ctx.beginPath();
        ctx.arc(block.x + block.w / 2, block.y + block.h / 2, 29, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(210, 245, 244, 0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(block.x + block.w / 2, block.y + block.h / 2, 20, 0, Math.PI * 2);
        ctx.stroke();
      }
      for (const bush of park.bushes) {
        ctx.fillStyle = PALETTE.grassDark;
        ctx.beginPath();
        ctx.arc(bush.x, bush.y, bush.r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(180, 210, 130, 0.35)';
        ctx.beginPath();
        ctx.arc(bush.x - bush.r * 0.3, bush.y - bush.r * 0.3, bush.r * 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawBeach(ctx, cam) {
    const view = cam.viewRect(200);
    const beach = world.beach;
    if (beach.x + beach.w + 40 < view.x || beach.x > view.x + view.w) return;
    ctx.fillStyle = patterns.sand;
    ctx.fillRect(beach.x, view.y - 20, beach.w, view.h + 40);
    // Wet sand at the waterline.
    ctx.fillStyle = PALETTE.sandDark;
    ctx.fillRect(beach.x + beach.w - 26, view.y - 20, 26, view.h + 40);
    ctx.fillStyle = withAlpha(PALETTE.waterFoam, 0.5);
    ctx.fillRect(beach.x + beach.w - 8, view.y - 20, 8, view.h + 40);
    for (const u of umbrellas) {
      if (u.x < view.x || u.x > view.x + view.w || u.y < view.y || u.y > view.y + view.h) continue;
      ctx.fillStyle = 'rgba(60, 34, 40, 0.2)';
      ctx.beginPath();
      ctx.ellipse(u.x + 10, u.y + 14, u.r, u.r * 0.7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = u.color;
      ctx.beginPath();
      ctx.arc(u.x, u.y, u.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 248, 228, 0.75)';
      for (let i = 0; i < 6; i += 1) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(u.x, u.y);
        ctx.arc(u.x, u.y, u.r, a, a + 0.22);
        ctx.closePath();
        ctx.fill();
      }
      ctx.fillStyle = '#f1e6cf';
      ctx.beginPath();
      ctx.arc(u.x, u.y, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawOcean(ctx, cam, time) {
    const view = cam.viewRect(120);
    if (view.x + view.w < world.water.x) return;
    const g = ctx.createLinearGradient(world.water.x, 0, world.water.x + 420, 0);
    g.addColorStop(0, PALETTE.water);
    g.addColorStop(0.55, PALETTE.water);
    g.addColorStop(1, PALETTE.waterDeep);
    ctx.fillStyle = g;
    ctx.fillRect(world.water.x, view.y - 40, view.w, view.h + 80);
    // Slow wave lines.
    ctx.strokeStyle = withAlpha(PALETTE.waterFoam, 0.4);
    ctx.lineWidth = 2;
    for (let i = 0; i < 14; i += 1) {
      const baseY = (view.y + i * 70 + time * 12) % (view.h + 80) + view.y - 40;
      const wave = Math.sin(time * 0.7 + i) * 4;
      ctx.beginPath();
      for (let x = 0; x < view.w; x += 28) {
        const y = baseY + Math.sin((x + i * 60) * 0.02 + time) * 3 + wave;
        if (x === 0) ctx.moveTo(view.x + x, y);
        else ctx.lineTo(view.x + x, y);
      }
      ctx.stroke();
    }
    // Boats.
    for (const boat of boats) {
      if (boat.x < view.x || boat.x > view.x + view.w || boat.y < view.y || boat.y > view.y + view.h) continue;
      ctx.save();
      ctx.translate(boat.x + Math.sin(time * 0.8 + boat.y) * 2, boat.y);
      ctx.rotate(boat.angle);
      ctx.fillStyle = 'rgba(12, 40, 49, 0.25)';
      ctx.beginPath();
      ctx.ellipse(3, 4, boat.wid, boat.len * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = boat.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, boat.wid, boat.len * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(30, 40, 46, 0.75)';
      ctx.fillRect(-boat.wid * 0.55, -boat.len * 0.18, boat.wid * 1.1, boat.len * 0.3);
      ctx.restore();
    }
  }

  /** The pier and marina walkway reaching out over the water. */
  function drawPiers(ctx, cam) {
    const view = cam.viewRect(100);
    const marina = world.landmarks.marina;
    if (!marina) return;
    const pierX = marina.block.x + marina.block.w + 20;
    if (pierX > view.x + view.w + 400 || pierX + 300 < view.x) return;
    for (let i = 0; i < 2; i += 1) {
      const y = marina.block.y + 90 + i * 150;
      ctx.fillStyle = '#9c7a58';
      ctx.fillRect(pierX, y, 300, 22);
      ctx.fillStyle = 'rgba(58, 36, 30, 0.4)';
      for (let x = pierX + 6; x < pierX + 300; x += 26) ctx.fillRect(x, y + 3, 3, 16);
      ctx.fillStyle = '#7d5c44';
      ctx.fillRect(pierX + 40, y - 34, 14, 34);
      ctx.fillRect(pierX + 236, y - 34, 14, 34);
    }
  }

  function drawBuilding(ctx, b) {
    if (b.fountain) return;
    const shadowOff = 13;
    ctx.fillStyle = 'rgba(46, 25, 40, 0.3)';
    ctx.fillRect(b.x + shadowOff, b.y + shadowOff, b.w, b.h);
    // Walls with a warm-lit south face.
    const wallGrad = ctx.createLinearGradient(b.x, b.y, b.x + b.w * 0.4, b.y + b.h);
    wallGrad.addColorStop(0, shade(b.wall, 0.1));
    wallGrad.addColorStop(1, b.wall);
    ctx.fillStyle = wallGrad;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    // A bright edge where the sun catches the north-west corner.
    ctx.fillStyle = 'rgba(255, 238, 200, 0.35)';
    ctx.fillRect(b.x, b.y, b.w, 2);
    ctx.fillRect(b.x, b.y, 2, b.h);
    // Roof.
    const inset = Math.min(10, Math.min(b.w, b.h) * 0.16);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x + inset, b.y + inset, b.w - inset * 2, b.h - inset * 2);
    ctx.strokeStyle = 'rgba(255, 246, 226, 0.22)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(b.x + inset, b.y + inset, b.w - inset * 2, b.h - inset * 2);
    // Roof clutter: AC boxes and vents.
    if (b.w > 60 && b.h > 50) {
      ctx.fillStyle = shade(b.roof, -0.18);
      ctx.fillRect(b.x + inset + 10, b.y + inset + 10, 14, 12);
      ctx.fillRect(b.x + b.w - inset - 30, b.y + b.h - inset - 22, 18, 10);
    }
    // Windows along the roof's edge, as if seen in a slight tilt.
    if (b.windows.length > 0) {
      ctx.fillStyle = b.windows[0].lit ? PALETTE.window : PALETTE.windowDark;
      for (let i = 0; i < b.windows.length; i += 1) {
        const win = b.windows[i];
        ctx.fillStyle = win.lit ? withAlpha(PALETTE.window, 0.55) : withAlpha(PALETTE.windowDark, 0.6);
        ctx.fillRect(win.x, win.y, win.w, win.h);
      }
    }
    // Awnings and a shop front on the south face.
    if (b.awning && b.w > 50) {
      const stripeW = 10;
      ctx.save();
      ctx.beginPath();
      ctx.rect(b.x + 4, b.y + b.h - 16, b.w - 8, 12);
      ctx.clip();
      for (let x = b.x + 4; x < b.x + b.w; x += stripeW * 2) {
        ctx.fillStyle = b.awningColor;
        ctx.fillRect(x, b.y + b.h - 16, stripeW, 12);
        ctx.fillStyle = 'rgba(255, 244, 222, 0.85)';
        ctx.fillRect(x + stripeW, b.y + b.h - 16, stripeW, 12);
      }
      ctx.restore();
      ctx.fillStyle = 'rgba(255, 236, 200, 0.3)';
      ctx.fillRect(b.x + 4, b.y + b.h - 18, b.w - 8, 2);
    }
    // Special buildings get their own marks.
    if (b.garage) {
      ctx.fillStyle = '#2c3b3a';
      ctx.fillRect(b.x + b.w - 74, b.y + b.h - 30, 58, 24);
      ctx.fillStyle = '#f5c451';
      ctx.fillRect(b.x + b.w - 70, b.y + b.h - 26, 8, 16);
      ctx.fillRect(b.x + b.w - 56, b.y + b.h - 26, 8, 16);
      ctx.fillStyle = '#5ff0d8';
      ctx.fillRect(b.x + 12, b.y + 12, 46, 12);
    }
    if (b.casino) {
      ctx.fillStyle = '#3b2231';
      ctx.fillRect(b.x + 14, b.y + b.h - 40, b.w - 28, 26);
      ctx.fillStyle = '#ffd166';
      for (let i = 0; i < 7; i += 1) ctx.fillRect(b.x + 24 + i * 20, b.y + b.h - 36, 10, 10);
    }
    if (b.tower) {
      // Radio mast: concentric squares and a red beacon.
      ctx.strokeStyle = '#c9c2b5';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(b.x + b.w / 2, b.y + b.h / 2, 26, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(b.x + b.w / 2, b.y + b.h / 2, 14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#e2554e';
      ctx.beginPath();
      ctx.arc(b.x + b.w / 2, b.y + b.h / 2, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    if (b.warehouse) {
      ctx.fillStyle = 'rgba(40, 32, 28, 0.35)';
      for (let i = 1; i < 5; i += 1) ctx.fillRect(b.x + 6, b.y + (b.h / 5) * i, b.w - 12, 3);
    }
  }

  function drawPalms(ctx, cam, time) {
    const view = cam.viewRect(120);
    for (const palm of PALMS) {
      if (palm.x < view.x || palm.x > view.x + view.w || palm.y < view.y || palm.y > view.y + view.h) continue;
      const sway = Math.sin(time * 0.6 + palm.sway) * 1.4;
      if (palm.lamp) {
        ctx.strokeStyle = '#5b4a3d';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(palm.x, palm.y + 12);
        ctx.lineTo(palm.x - 2, palm.y - 10);
        ctx.lineTo(palm.x + 8, palm.y - 14);
        ctx.stroke();
        painter.glow(palm.x + 10, palm.y - 15, 26, '#ffd9a0', 0.22);
        ctx.fillStyle = '#ffe6b3';
        ctx.beginPath();
        ctx.arc(palm.x + 10, palm.y - 15, 4, 0, Math.PI * 2);
        ctx.fill();
        continue;
      }
      ctx.fillStyle = 'rgba(44, 26, 38, 0.22)';
      ctx.beginPath();
      ctx.ellipse(palm.x + 8, palm.y + 9, palm.r * 0.9, palm.r * 0.55, 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#6b4a34';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(palm.x, palm.y + 6);
      ctx.lineTo(palm.x + sway, palm.y - 4);
      ctx.stroke();
      const fronds = 6;
      for (let i = 0; i < fronds; i += 1) {
        const a = (i / fronds) * Math.PI * 2 + sway * 0.04;
        ctx.strokeStyle = i % 2 === 0 ? '#4f7a3a' : '#5f8c43';
        ctx.lineWidth = 5;
        ctx.beginPath();
        ctx.moveTo(palm.x + sway, palm.y - 4);
        ctx.quadraticCurveTo(
          palm.x + Math.cos(a) * palm.r * 0.8 + sway,
          palm.y + Math.sin(a) * palm.r * 0.8 - 4,
          palm.x + Math.cos(a) * palm.r * 1.5 + sway,
          palm.y + Math.sin(a) * palm.r * 1.5 - 4,
        );
        ctx.stroke();
      }
      ctx.fillStyle = '#8fa75c';
      ctx.beginPath();
      ctx.arc(palm.x + sway, palm.y - 6, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawSigns(ctx, cam) {
    const view = cam.viewRect(120);
    for (const sign of signs) {
      if (sign.x < view.x - 120 || sign.x > view.x + view.w + 120 || sign.y < view.y - 80 || sign.y > view.y + view.h + 80) continue;
      const w = 128;
      const h = 42;
      const x = sign.x - w / 2;
      const y = sign.y - h / 2;
      ctx.fillStyle = 'rgba(28, 18, 26, 0.88)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = withAlpha(sign.color, 0.85);
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
      painter.text(sign.text, sign.x, y + 19, 15, sign.color, { align: 'center', weight: '800', baseline: 'middle' });
      painter.text(sign.sub, sign.x, y + 32, 8, withAlpha(sign.color, 0.75), { align: 'center', weight: '700', baseline: 'middle' });
      painter.glow(sign.x, sign.y, 96, sign.color, 0.1);
    }
  }

  function draw(cam, time) {
    const ctx = painter.ctx;
    cam.shakeX ??= 0; cam.shakeY ??= 0; cam.zoom ??= 1;
    ctx.fillStyle = PALETTE.asphalt;
    ctx.fillRect(0, 0, cam.width, cam.height);
    // Everything world-side gets the camera transform.
    ctx.save();
    ctx.translate(cam.width / 2 + cam.shakeX, cam.height / 2 + cam.shakeY);
    ctx.scale(cam.zoom, cam.zoom);
    ctx.translate(-cam.x, -cam.y);

    // Ground base: fill only the visible slice.
    const view = cam.viewRect(90);
    ctx.fillStyle = patterns.asphalt;
    ctx.fillRect(view.x, view.y, view.w, view.h);
    drawRoads(cam);
    drawBlocks(cam);
    drawBeach(ctx, cam);
    drawPiers(ctx, cam);
    drawOcean(ctx, cam, time);

    // Building shadows and bodies.
    for (const b of world.buildings) {
      if (b.x + b.w + 40 < view.x || b.x - 40 > view.x + view.w || b.y + b.h + 40 < view.y || b.y - 40 > view.y + view.h) continue;
      drawBuilding(ctx, b);
    }
    drawPalms(ctx, cam, time);
    drawSigns(ctx, cam);
    ctx.restore();
  }

  return { draw, minimap, mapScreen, drawBuilding, patterns };
}

function streetY(world, row) {
  return CITY.road + row * (CITY.block + CITY.road) - CITY.road / 2;
}

function avenueX(world, col) {
  return CITY.road + col * (CITY.block + CITY.road) - CITY.road / 2;
}

/** Small tiling textures so the ground is not flat colour. */
function makePatterns(ctx) {
  const make = (size, paint) => {
    const c = document.createElement('canvas');
    c.width = size;
    c.height = size;
    const g = c.getContext('2d');
    paint(g, size);
    return ctx.createPattern(c, 'repeat');
  };
  const asphalt = make(96, (g, size) => {
    g.fillStyle = PALETTE.asphalt;
    g.fillRect(0, 0, size, size);
    const rnd = createRandom(4711);
    for (let i = 0; i < 420; i += 1) {
      const v = 0.04 + rnd() * 0.07;
      g.fillStyle = rnd() < 0.5 ? `rgba(255, 240, 220, ${v})` : `rgba(20, 12, 18, ${v})`;
      g.fillRect(rnd() * size, rnd() * size, 1 + rnd() * 2, 1 + rnd() * 2);
    }
  });
  const asphaltDark = make(80, (g, size) => {
    g.fillStyle = PALETTE.asphaltDark;
    g.fillRect(0, 0, size, size);
    const rnd = createRandom(99);
    for (let i = 0; i < 260; i += 1) {
      g.fillStyle = `rgba(255, 235, 210, ${0.03 + rnd() * 0.05})`;
      g.fillRect(rnd() * size, rnd() * size, 2, 1);
    }
  });
  const sidewalk = make(64, (g, size) => {
    g.fillStyle = PALETTE.sidewalk;
    g.fillRect(0, 0, size, size);
    g.strokeStyle = withAlpha(PALETTE.sidewalkLine, 0.7);
    g.lineWidth = 1;
    for (let i = 0; i <= size; i += 16) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i, size);
      g.moveTo(0, i);
      g.lineTo(size, i);
      g.stroke();
    }
  });
  const plaza = make(64, (g, size) => {
    g.fillStyle = '#cdbb9b';
    g.fillRect(0, 0, size, size);
    g.strokeStyle = 'rgba(150, 125, 100, 0.5)';
    g.lineWidth = 1.5;
    for (let i = 0; i <= size; i += 32) {
      g.beginPath();
      g.moveTo(i, 0);
      g.lineTo(i, size);
      g.moveTo(0, i);
      g.lineTo(size, i);
      g.stroke();
    }
    g.fillStyle = 'rgba(255, 248, 226, 0.22)';
    for (let i = 8; i < size; i += 32) g.fillRect(i, 2, 16, 2);
  });
  const grass = make(64, (g, size) => {
    g.fillStyle = PALETTE.grass;
    g.fillRect(0, 0, size, size);
    const rnd = createRandom(1337);
    for (let i = 0; i < 260; i += 1) {
      g.fillStyle = rnd() < 0.5 ? 'rgba(66, 92, 48, 0.5)' : 'rgba(174, 198, 118, 0.4)';
      g.fillRect(rnd() * size, rnd() * size, 1, 2 + rnd() * 3);
    }
    for (let i = 0; i < 12; i += 1) {
      g.fillStyle = ['#f5d67a', '#f2a8b8', '#f8f0d8'][Math.floor(rnd() * 3)];
      g.fillRect(rnd() * size, rnd() * size, 2, 2);
    }
  });
  const sand = make(64, (g, size) => {
    g.fillStyle = PALETTE.sand;
    g.fillRect(0, 0, size, size);
    const rnd = createRandom(5150);
    for (let i = 0; i < 240; i += 1) {
      g.fillStyle = rnd() < 0.5 ? 'rgba(255, 250, 230, 0.4)' : 'rgba(160, 130, 90, 0.25)';
      g.fillRect(rnd() * size, rnd() * size, 1, 1);
    }
  });
  const parking = make(64, (g, size) => {
    g.fillStyle = '#55504b';
    g.fillRect(0, 0, size, size);
    const rnd = createRandom(2024);
    for (let i = 0; i < 200; i += 1) {
      g.fillStyle = `rgba(255, 240, 220, ${0.03 + rnd() * 0.05})`;
      g.fillRect(rnd() * size, rnd() * size, 2, 1);
    }
  });
  return { asphalt, asphaltDark, sidewalk, plaza, grass, sand, parking };
}

/** The minimap image: the whole city at a small scale, drawn once at boot. */
function bakeMinimap(world) {
  const scale = 0.11;
  const src = world.width + world.ocean;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(src * scale);
  canvas.height = Math.round(world.height * scale);
  const g = canvas.getContext('2d');
  g.scale(scale, scale);
  g.fillStyle = '#3b3532';
  g.fillRect(0, 0, world.width + world.ocean, world.height);
  g.fillStyle = '#2d8f9b';
  g.fillRect(world.water.x, 0, world.ocean, world.height);
  g.fillStyle = PALETTE.sand;
  g.fillRect(world.beach.x, 0, world.beach.w, world.height);
  g.fillStyle = '#4b4442';
  for (let row = 0; row <= CITY.rows; row += 1) {
    g.fillRect(0, streetY(world, row) - CITY.road / 2, world.width, CITY.road);
  }
  for (let col = 0; col <= CITY.cols; col += 1) {
    g.fillRect(avenueX(world, col) - CITY.road / 2, 0, CITY.road, world.height);
  }
  for (const block of world.blocks) {
    let color = '#c9b795';
    if (block.kind === 'park') color = '#7d9a55';
    else if (block.kind === 'marina' || block.kind === 'docks') color = '#6d625a';
    else if (block.kind === 'plaza') color = '#cdbb9b';
    else if (block.kind === 'garage') color = '#4b6f6a';
    else if (block.kind === 'casino') color = '#a8874a';
    g.fillStyle = color;
    g.fillRect(block.x, block.y, block.w, block.h);
  }
  g.fillStyle = 'rgba(70, 50, 45, 0.6)';
  for (const b of world.buildings) {
    g.fillRect(b.x, b.y, b.w, b.h);
  }
  return canvas;
}

/** A zoomed, labelled map for the full-screen pauses map. */
function bakeMapScreen(world) {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 900;
  const g = canvas.getContext('2d');
  const scale = canvas.width / (world.width + world.ocean);
  g.scale(scale, scale);
  g.fillStyle = '#312a2d';
  g.fillRect(0, 0, world.width + world.ocean, world.height);
  g.fillStyle = '#2d8f9b';
  g.fillRect(world.water.x, 0, world.ocean, world.height);
  g.fillStyle = PALETTE.sand;
  g.fillRect(world.beach.x, 0, world.beach.w, world.height);
  g.fillStyle = '#55504b';
  for (let row = 0; row <= CITY.rows; row += 1) g.fillRect(0, streetY(world, row) - CITY.road / 2, world.width, CITY.road);
  for (let col = 0; col <= CITY.cols; col += 1) g.fillRect(avenueX(world, col) - CITY.road / 2, 0, CITY.road, world.height);
  for (const block of world.blocks) {
    let color = '#cdbb9b';
    if (block.kind === 'park') color = '#7d9a55';
    else if (block.kind === 'marina' || block.kind === 'docks') color = '#6d625a';
    else if (block.kind === 'garage') color = '#4b6f6a';
    else if (block.kind === 'casino') color = '#a8874a';
    g.fillStyle = color;
    g.fillRect(block.x + 6, block.y + 6, block.w - 12, block.h - 12);
  }
  g.fillStyle = 'rgba(70, 50, 45, 0.62)';
  for (const b of world.buildings) g.fillRect(b.x, b.y, b.w, b.h);
  return { canvas, scale };
}

export { PALMS };
