// Screen-space HUD, minimap and menu. All art is drawn with canvas primitives.
import { FONT, FONT_DISPLAY, PALETTE } from './config.js';

export function drawHud(ctx, game, camera) {
  const { width: w, height: h } = camera;
  const p = game.player, mission = game.objective;
  ctx.save();
  panel(ctx, 22, 20, 250, 54);
  ctx.fillStyle = PALETTE.neonTeal; ctx.fillRect(36, 34, 3, 25);
  text(ctx, 'SAN AURELIO', 50, 43, 15, PALETTE.text, '800', FONT_DISPLAY);
  text(ctx, '18:12  ·  LAS PALMAS', 50, 60, 9, PALETTE.muted, '700', FONT);
  text(ctx, `$${p.money.toLocaleString()}`, 254, 43, 17, PALETTE.money, '800', FONT, 'right');
  text(ctx, 'CASH', 254, 59, 8, PALETTE.muted, '700', FONT, 'right');

  const mw = Math.min(410, w * 0.39);
  panel(ctx, w / 2 - mw / 2, 18, mw, 91);
  text(ctx, 'CURRENT JOB', w / 2 - mw / 2 + 17, 39, 9, PALETTE.gold, '800', FONT);
  text(ctx, fit(ctx, mission.title.toUpperCase(), mw - 34, 16), w / 2 - mw / 2 + 17, 61, 16, PALETTE.text, '800', FONT_DISPLAY);
  text(ctx, fit(ctx, mission.text, mw - 34, 12), w / 2 - mw / 2 + 17, 82, 12, '#f2e4c7', '600', FONT);
  text(ctx, mission.action, w / 2 - mw / 2 + 17, 100, 9, PALETTE.neonTeal, '800', FONT);

  panel(ctx, w - 224, 20, 202, 54);
  text(ctx, 'WANTED', w - 208, 42, 9, PALETTE.muted, '800', FONT);
  for (let i = 0; i < 5; i += 1) star(ctx, w - 145 + i * 24, 47, 9, i < game.police.stars ? '#ff6759' : '#59494a', i < game.police.stars ? '#ffd4a1' : '#82716d');

  panel(ctx, 22, h - 108, 240, 86);
  text(ctx, 'MILO REYES', 38, h - 84, 10, PALETTE.text, '800', FONT);
  text(ctx, p.vehicle ? `${p.vehicle.kind.name.toUpperCase()}  ·  ${Math.round(Math.abs(p.vehicle.speed) * 0.19)} MPH` : p.weapon.toUpperCase(), 38, h - 66, 9, PALETTE.muted, '700', FONT);
  bar(ctx, 38, h - 55, 188, 10, p.health / 100, PALETTE.health);
  bar(ctx, 38, h - 35, 188, 7, p.armor / 100, PALETTE.armor);

  drawMinimap(ctx, game, w - 208, h - 210, 186, 186);
  text(ctx, 'N', w - 116, h - 215, 9, PALETTE.text, '800', FONT, 'center');

  const hint = p.vehicle ? 'E  EXIT VEHICLE     SPACE  HANDBRAKE' : game.nearCar ? 'E  STEAL / ENTER VEHICLE' : 'WASD MOVE  ·  MOUSE AIM  ·  CLICK FIRE  ·  SHIFT SPRINT';
  const hw = Math.min(w - 40, 440);
  panel(ctx, w / 2 - hw / 2, h - 54, hw, 32, true);
  text(ctx, hint, w / 2, h - 33, 10, PALETTE.text, '700', FONT, 'center');

  if (game.toastTimer > 0 && game.toast) {
    const tw = Math.min(720, w * 0.8);
    panel(ctx, w / 2 - tw / 2, 122, tw, 42);
    text(ctx, fit(ctx, game.toast, tw - 34, 12), w / 2, 148, 12, '#fff1d3', '700', FONT, 'center');
  }
  if (mission.marker) drawMarker(ctx, camera, p, mission.marker);
  ctx.restore();
}

export function drawTitle(ctx, w, h, saved) {
  ctx.fillStyle = 'rgba(18, 14, 20, 0.45)'; ctx.fillRect(0, 0, w, h);
  ctx.save();
  const cx = w * 0.5;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.shadowColor = '#ef7654'; ctx.shadowBlur = 26;
  ctx.fillStyle = '#f5cb78'; ctx.font = `900 ${Math.min(76, w * 0.085)}px ${FONT_DISPLAY}`;
  ctx.fillText('SUNSET RUN', cx, h * 0.31);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fff0d2'; ctx.font = `700 ${Math.min(20, w * 0.023)}px ${FONT}`;
  ctx.fillText('SAN AURELIO  ·  A CITY THAT NEVER FORGETS', cx, h * 0.405);
  ctx.fillStyle = '#8ee5d1'; ctx.font = `800 ${Math.min(18, w * 0.021)}px ${FONT}`;
  ctx.fillText('PRESS ENTER OR CLICK TO PLAY', cx, h * 0.61);
  ctx.fillStyle = 'rgba(255,240,210,.75)'; ctx.font = `600 ${Math.min(13, w * 0.016)}px ${FONT}`;
  ctx.fillText('WASD WALK / DRIVE   ·   E ENTER / EXIT   ·   MOUSE AIM   ·   CLICK FIRE', cx, h * 0.67);
  ctx.fillText('SHIFT SPRINT   ·   M MAP   ·   P PAUSE', cx, h * 0.705);
  if (saved > 0) ctx.fillText(`SAVED CAREER  ·  $${saved.toLocaleString()}`, cx, h * 0.78);
  ctx.restore();
}
export function drawPause(ctx, w, h) {
  ctx.fillStyle = 'rgba(12, 12, 17, .66)'; ctx.fillRect(0, 0, w, h);
  panel(ctx, w / 2 - 190, h / 2 - 92, 380, 184);
  text(ctx, 'PAUSED', w / 2, h / 2 - 28, 34, PALETTE.gold, '900', FONT_DISPLAY, 'center');
  text(ctx, 'P / ESC  RESUME     ·     M  CITY MAP', w / 2, h / 2 + 25, 13, PALETTE.text, '700', FONT, 'center');
  text(ctx, 'Your progress saves automatically.', w / 2, h / 2 + 55, 11, PALETTE.muted, '600', FONT, 'center');
}
export function drawMap(ctx, game, camera) {
  const w = camera.width, h = camera.height;
  ctx.fillStyle = 'rgba(10, 18, 23, .93)'; ctx.fillRect(0, 0, w, h);
  text(ctx, 'SAN AURELIO  /  CITY MAP', 38, 48, 18, PALETTE.gold, '900', FONT_DISPLAY);
  text(ctx, 'NORTH ↑      M / ESC TO RETURN', w - 38, 48, 11, PALETTE.text, '700', FONT, 'right');
  const city = game.world;
  const scale = Math.min((w - 100) / (city.width + city.ocean), (h - 115) / city.height);
  const ox = (w - (city.width + city.ocean) * scale) / 2, oy = 68 + (h - 92 - city.height * scale) / 2;
  ctx.fillStyle = '#266d78'; ctx.fillRect(ox, oy, (city.width + city.ocean) * scale, city.height * scale);
  ctx.fillStyle = '#e3cc95'; ctx.fillRect(ox, oy, city.width * scale, city.height * scale);
  ctx.fillStyle = '#45403d';
  for (let i = 0; i <= 12; i++) { const v = (100 + i * 400) * scale; ctx.fillRect(ox, oy + v - 50 * scale, city.width * scale, 100 * scale); ctx.fillRect(ox + v - 50 * scale, oy, 100 * scale, city.height * scale); }
  for (const b of city.blocks) { ctx.fillStyle = b.kind === 'park' ? '#799858' : b.kind === 'casino' ? '#d0a84e' : '#c3ad8b'; ctx.fillRect(ox + b.x * scale, oy + b.y * scale, b.w * scale, b.h * scale); }
  for (const [id, lm] of Object.entries(city.landmarks)) {
    ctx.fillStyle = '#fff0c4'; ctx.beginPath(); ctx.arc(ox + lm.x * scale, oy + lm.y * scale, 3.5, 0, 7); ctx.fill();
    text(ctx, lm.name.toUpperCase(), ox + lm.x * scale + 7, oy + lm.y * scale + 3, 8, '#fff4da', '800', FONT);
  }
  for (const cop of game.police.units) { ctx.fillStyle = '#ff5e52'; ctx.beginPath(); ctx.arc(ox + cop.x * scale, oy + cop.y * scale, 4, 0, 7); ctx.fill(); }
  const p = game.player; ctx.fillStyle = '#5ff0d8'; ctx.beginPath(); ctx.arc(ox + p.x * scale, oy + p.y * scale, 5, 0, 7); ctx.fill();
  if (game.objective.marker) { ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(ox + game.objective.marker.x * scale, oy + game.objective.marker.y * scale, 8, 0, 7); ctx.stroke(); }
}

function drawMinimap(ctx, game, x, y, w, h) {
  ctx.save(); ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, w / 2, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#1c3f49'; ctx.fillRect(x, y, w, h);
  const city = game.world, totalW = city.width + city.ocean;
  const scale = Math.min((w - 8) / totalW, (h - 8) / city.height);
  const mw = totalW * scale, mh = city.height * scale, ox = x + (w - mw) / 2, oy = y + (h - mh) / 2;
  ctx.fillStyle = '#d1b985'; ctx.fillRect(ox, oy, city.width * scale, city.height * scale);
  ctx.fillStyle = '#2d8995'; ctx.fillRect(ox + city.water.x * scale, oy, city.ocean * scale, city.height * scale);
  ctx.fillStyle = '#dfc88f'; ctx.fillRect(ox + city.beach.x * scale, oy, city.beach.w * scale, city.height * scale);
  ctx.fillStyle = '#494441';
  for (let i = 0; i <= 12; i++) { const v = (100 + i * 400) * scale; ctx.fillRect(ox, oy + v - 50 * scale, city.width * scale, 100 * scale); ctx.fillRect(ox + v - 50 * scale, oy, 100 * scale, city.height * scale); }
  for (const b of city.blocks) {
    ctx.fillStyle = b.kind === 'park' ? '#769351' : b.kind === 'casino' ? '#c4a04a' : b.kind === 'marina' ? '#827c68' : '#c3ad8b';
    ctx.fillRect(ox + b.x * scale, oy + b.y * scale, b.w * scale, b.h * scale);
  }
  for (const car of game.cars) if (car === game.player.vehicle || Math.hypot(car.x - game.player.x, car.y - game.player.y) < 900) {
    ctx.fillStyle = car === game.player.vehicle ? '#5ff0d8' : '#f2e2b2'; ctx.fillRect(ox + car.x * scale - 1, oy + car.y * scale - 1, 2.5, 2.5);
  }
  for (const cop of game.police.units) { ctx.fillStyle = '#ff5f57'; ctx.fillRect(ox + cop.x * scale - 1.5, oy + cop.y * scale - 1.5, 3.5, 3.5); }
  if (game.objective.marker) { ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(ox + game.objective.marker.x * scale, oy + game.objective.marker.y * scale, 3.5, 0, 7); ctx.fill(); }
  const p = game.player; ctx.fillStyle = '#54ffe0'; ctx.beginPath(); ctx.arc(ox + p.x * scale, oy + p.y * scale, 3.5, 0, 7); ctx.fill();
  ctx.restore();
  ctx.strokeStyle = 'rgba(245,196,81,.8)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, w / 2, 0, 7); ctx.stroke();
}
function drawMarker(ctx, camera, player, marker) {
  const sx = (marker.x - camera.x) * camera.zoom + camera.width / 2;
  const sy = (marker.y - camera.y) * camera.zoom + camera.height / 2;
  const margin = 36, x = Math.max(margin, Math.min(camera.width - margin, sx)), y = Math.max(130, Math.min(camera.height - margin, sy));
  if (Math.abs(sx - x) < 3 && Math.abs(sy - y) < 3) return;
  ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(sy - y, sx - x));
  ctx.fillStyle = PALETTE.gold; ctx.beginPath(); ctx.moveTo(13, 0); ctx.lineTo(-8, -7); ctx.lineTo(-4, 0); ctx.lineTo(-8, 7); ctx.closePath(); ctx.fill();
  ctx.restore();
}
function bar(ctx, x, y, w, h, pct, color) { ctx.fillStyle = 'rgba(12,13,17,.75)'; ctx.fillRect(x, y, w, h); ctx.fillStyle = color; ctx.fillRect(x + 1, y + 1, Math.max(0, (w - 2) * Math.max(0, Math.min(1, pct))), h - 2); }
function star(ctx, x, y, r, color, stroke) { ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .43 : r; const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr; if (!i) ctx.moveTo(px, py); else ctx.lineTo(px, py); } ctx.closePath(); ctx.fillStyle = color; ctx.fill(); ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
function panel(ctx, x, y, w, h, subtle = false) { ctx.fillStyle = 'rgba(27,20,27,.9)'; ctx.fillRect(x, y, w, h); ctx.strokeStyle = subtle ? 'rgba(229,213,182,.22)' : 'rgba(245,196,81,.42)'; ctx.lineWidth = 1; ctx.strokeRect(x + .5, y + .5, w - 1, h - 1); }
function text(ctx, value, x, y, size, color, weight = '600', family = FONT, align = 'left') { ctx.font = `${weight} ${size}px ${family}`; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillText(value, x, y); }
function fit(ctx, value, max, size) { ctx.font = `600 ${size}px ${FONT}`; if (ctx.measureText(value).width <= max) return value; let out = value; while (out.length > 3 && ctx.measureText(out + '…').width > max) out = out.slice(0, -1); return `${out}…`; }
