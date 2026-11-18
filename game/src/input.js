// Keyboard and pointer controls. Press edges are kept until the simulation consumes them.
const PREVENT = new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Tab']);
export function createInput(canvas) {
  const held = new Set();
  const pressed = new Set();
  const pointer = { x: 0, y: 0, down: false, pressed: false, inside: false };
  const pos = (event) => {
    const r = canvas.getBoundingClientRect();
    pointer.x = event.clientX - r.left;
    pointer.y = event.clientY - r.top;
    pointer.inside = true;
  };
  window.addEventListener('keydown', (e) => {
    if (!e.repeat) { held.add(e.code); pressed.add(e.code); }
    if (PREVENT.has(e.code)) e.preventDefault();
  });
  window.addEventListener('keyup', (e) => held.delete(e.code));
  window.addEventListener('blur', () => { held.clear(); pointer.down = false; });
  canvas.addEventListener('pointermove', pos);
  canvas.addEventListener('pointerdown', (e) => {
    pos(e); pointer.down = true; pointer.pressed = true;
    canvas.setPointerCapture?.(e.pointerId); e.preventDefault();
  });
  canvas.addEventListener('pointerup', (e) => { pointer.down = false; canvas.releasePointerCapture?.(e.pointerId); });
  canvas.addEventListener('pointerleave', () => { pointer.inside = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  return {
    pointer,
    held: (key) => held.has(key),
    pressed: (key) => pressed.has(key),
    consume: (key) => { const yes = pressed.has(key); pressed.delete(key); return yes; },
    move() {
      const x = (held.has('KeyD') || held.has('ArrowRight') ? 1 : 0) - (held.has('KeyA') || held.has('ArrowLeft') ? 1 : 0);
      const y = (held.has('KeyS') || held.has('ArrowDown') ? 1 : 0) - (held.has('KeyW') || held.has('ArrowUp') ? 1 : 0);
      const n = Math.hypot(x, y) || 1;
      return { x: x / n, y: y / n };
    },
    clearEdges() { pressed.clear(); pointer.pressed = false; },
  };
}
