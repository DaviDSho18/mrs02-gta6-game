// Camera, city art composition and screen-space overlays.
import { CITY, PALETTE } from './config.js';
import { createCityArt } from './city-art.js';
import { drawHud, drawTitle, drawPause, drawMap } from './hud.js';

export const SCREEN_TITLE = 'title', SCREEN_PLAY = 'play', SCREEN_PAUSED = 'paused', SCREEN_MAP = 'map';
export function createCamera() {
  const cam = { x: 0, y: 0, zoom: 1, width: 1280, height: 720, shakeX: 0, shakeY: 0 };
  cam.follow = (x, y, dt, lerp = 5) => { const k = 1 - Math.exp(-lerp * dt); cam.x += (x - cam.x) * k; cam.y += (y - cam.y) * k; };
  cam.snapTo = (x, y) => { cam.x = x; cam.y = y; };
  cam.viewRect = (pad = 80) => ({ x: cam.x - cam.width / (2 * cam.zoom) - pad, y: cam.y - cam.height / (2 * cam.zoom) - pad, w: cam.width / cam.zoom + pad * 2, h: cam.height / cam.zoom + pad * 2 });
  return cam;
}
function resize(canvas, ctx, cam) {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.floor(canvas.clientWidth * dpr)), h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  cam.width = canvas.clientWidth; cam.height = canvas.clientHeight;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const cam = createCamera();
  const art = (world) => createCityArt(world, { ctx, text(value, x, y, size, color, opts = {}) { ctx.font = `${opts.weight ?? '600'} ${size}px ${opts.family ?? 'system-ui'}`; ctx.fillStyle = color; ctx.textAlign = opts.align ?? 'left'; ctx.textBaseline = opts.baseline ?? 'alphabetic'; ctx.fillText(value, x, y); }, glow(x, y, r, color, alpha = .5) { const g = ctx.createRadialGradient(x,y,0,x,y,r); g.addColorStop(0,colorWithAlpha(color,alpha)); g.addColorStop(1,colorWithAlpha(color,0)); ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill(); } });
  let artRef;
  function drawActor(game, time) {
    const { player, cars, pedestrians, police, combat } = game;
    ctx.save(); ctx.translate(cam.width/2,cam.height/2);ctx.scale(cam.zoom,cam.zoom);ctx.translate(-cam.x,-cam.y);
    // Layer traffic, pedestrians, then player and pursuers for clear silhouettes.
    for (const car of cars) drawCar(ctx, car, time, false);
    for (const p of pedestrians) if (!p.dead && visible(p.x,p.y,cam,160)) drawPed(ctx,p,time);
    for (const c of police.units) drawCar(ctx,c,time,true);
    for (const p of combat.pickups) { const bob=Math.sin(time*4+p.phase)*5; ctx.fillStyle=p.type==='cash'?'#ffe177':'#74e5d1'; ctx.beginPath();ctx.arc(p.x,p.y+bob,9,0,7);ctx.fill();ctx.fillStyle='#7a4b37';ctx.font='bold 9px system-ui';ctx.textAlign='center';ctx.fillText(p.type==='cash'?'$':'+',p.x,p.y+bob+3); }
    for (const b of combat.bullets) { ctx.fillStyle=b.color;ctx.shadowColor=b.color;ctx.shadowBlur=9;ctx.beginPath();ctx.arc(b.x,b.y,b.radius,0,7);ctx.fill();ctx.shadowBlur=0; }
    for (const e of combat.effects) { const q=e.life/e.max;ctx.globalAlpha=q;ctx.fillStyle=e.color;ctx.beginPath();ctx.arc(e.x,e.y,12*(1-q)+3,0,7);ctx.fill();ctx.globalAlpha=1; }
    if (!player.vehicle) drawPlayer(ctx,player,time);
    if (game.missions.crate) { ctx.fillStyle='#ab6d38';ctx.fillRect(player.x+24,player.y+7,18,18);ctx.strokeStyle='#f1cd78';ctx.strokeRect(player.x+24,player.y+7,18,18); }
    ctx.restore();
  }
  function draw(state, screen, best = 0) {
    resize(canvas,ctx,cam);
    const game = state;
    cam.follow(game.player.x, game.player.y, 1/60, game.player.vehicle ? 4.5 : 6);
    cam.x = Math.max(cam.width/2,Math.min(game.world.width+game.world.ocean-cam.width/2,cam.x));
    cam.y = Math.max(cam.height/2,Math.min(game.world.height-cam.height/2,cam.y));
    ctx.fillStyle=PALETTE.backdrop;ctx.fillRect(0,0,cam.width,cam.height);
    if (!artRef || artRef.world !== game.world) artRef = { world: game.world, art: art(game.world) };
    artRef.art.draw(cam,game.time);
    drawActor(game,game.time);
    if (screen===SCREEN_PLAY || screen===SCREEN_PAUSED || screen===SCREEN_MAP) drawHud(ctx,game,cam);
    if (screen===SCREEN_TITLE) drawTitle(ctx,cam.width,cam.height,best);
    if (screen===SCREEN_PAUSED) drawPause(ctx,cam.width,cam.height);
    if (screen===SCREEN_MAP) drawMap(ctx,game,cam);
  }
  return { draw, camera: cam };
}
function visible(x,y,cam,pad=0) { return x>cam.x-cam.width/2-pad&&x<cam.x+cam.width/2+pad&&y>cam.y-cam.height/2-pad&&y<cam.y+cam.height/2+pad; }
function drawCar(ctx, car, time, cop) {
  if (!visible(car.x,car.y,{x:ctx._cx??1e20,y:ctx._cy??1e20,width:0,height:0},100)) {} // culling deliberately delegated to canvas viewport
  ctx.save();ctx.translate(car.x,car.y);ctx.rotate(car.angle);
  const len=cop?58:(car.kind?.length??58), wid=cop?30:(car.kind?.width??28);
  ctx.fillStyle='rgba(24,17,22,.3)';ctx.beginPath();ctx.ellipse(3,5,len*.55,wid*.6,0,0,7);ctx.fill();
  ctx.fillStyle=cop?'#e9e6dc':(car.color??'#e9e6dc');ctx.beginPath();ctx.roundRect(-len/2,-wid/2,len,wid,7);ctx.fill();
  ctx.fillStyle=cop?'#253e55':'rgba(31,56,63,.82)';ctx.beginPath();ctx.roundRect(-len*.13,-wid*.34,len*.42,wid*.68,5);ctx.fill();
  ctx.fillStyle='#f6e2ad';ctx.fillRect(len*.38,-wid*.31,6,5);ctx.fillRect(len*.38,wid*.12,6,5);
  ctx.fillStyle='#db6154';ctx.fillRect(-len*.48,-wid*.3,4,5);ctx.fillRect(-len*.48,wid*.12,4,5);
  if(cop){const blink=Math.sin(time*9)>0;ctx.fillStyle=blink?'#ff4c56':'#55c7ff';ctx.fillRect(-4,-wid*.49,10,4);ctx.fillStyle=blink?'#55c7ff':'#ff4c56';ctx.fillRect(-4,wid*.35,10,4);}
  if(car.stolen && !cop){ctx.strokeStyle='rgba(245,196,81,.7)';ctx.lineWidth=1;ctx.strokeRect(-len/2-2,-wid/2-2,len+4,wid+4);}
  ctx.restore();
}
function drawPed(ctx,p,time){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.fillStyle='rgba(25,18,21,.24)';ctx.beginPath();ctx.ellipse(2,4,8,5,0,0,7);ctx.fill();ctx.fillStyle=p.hostile?'#423748':p.color;ctx.beginPath();ctx.ellipse(0,0,6,9,0,0,7);ctx.fill();ctx.fillStyle='#d9a47d';ctx.beginPath();ctx.arc(0,-6,4.4,0,7);ctx.fill();ctx.fillStyle='#29383c';ctx.fillRect(-5,5,4,5);ctx.fillRect(1,5,4,5);if(p.hostile){ctx.strokeStyle='#ed7862';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,12,0,7);ctx.stroke();}ctx.restore();}
function drawPlayer(ctx,p,time){ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.angle);ctx.fillStyle='rgba(20,14,20,.32)';ctx.beginPath();ctx.ellipse(3,5,12,8,0,0,7);ctx.fill();ctx.fillStyle=p.invulnerable>0&&Math.floor(time*18)%2?'#fff4d3':'#46c9b4';ctx.beginPath();ctx.ellipse(0,0,8,12,0,0,7);ctx.fill();ctx.fillStyle='#b98261';ctx.beginPath();ctx.arc(0,-7,5.5,0,7);ctx.fill();ctx.fillStyle='#263943';ctx.fillRect(-6,7,5,6);ctx.fillRect(2,7,5,6);ctx.strokeStyle='#f5d078';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(2,-1);ctx.lineTo(13,-1);ctx.stroke();ctx.restore();}
function colorWithAlpha(color,a){if(color.startsWith('#')){const n=parseInt(color.slice(1),16);return `rgba(${n>>16},${(n>>8)&255},${n&255},${a})`;}return color;}
export function withAlpha(color,a){return colorWithAlpha(color,a);}
export function shade(hex,amount){if(!hex.startsWith('#'))return hex;const n=parseInt(hex.slice(1),16),mix=c=>Math.round(c+(amount>0?255-c:-c)*Math.abs(amount));return `rgb(${mix((n>>16)&255)},${mix((n>>8)&255)},${mix(n&255)})`;}
