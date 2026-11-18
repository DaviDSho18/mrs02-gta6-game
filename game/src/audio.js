// Offline WebAudio one-shots and a gentle engine/siren bed. Audio starts only after player input.
export function createAudio() {
  let ctx = null; let engine = null; let engineGain = null; let sirenOsc = null; let sirenGain = null;
  function unlock() {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      engine = ctx.createOscillator(); engine.type = 'sawtooth'; engine.frequency.value = 52;
      engineGain = ctx.createGain(); engineGain.gain.value = 0;
      const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 210;
      engine.connect(filter).connect(engineGain).connect(ctx.destination); engine.start();
      sirenOsc = ctx.createOscillator(); sirenOsc.type = 'sine'; sirenOsc.frequency.value = 700;
      sirenGain = ctx.createGain(); sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain).connect(ctx.destination); sirenOsc.start();
    } catch { ctx = null; }
  }
  function tone(freq, duration, type = 'sine', volume = 0.07) {
    if (!ctx) return;
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(volume, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + duration);
  }
  return {
    unlock,
    gun() { unlock(); tone(92, 0.11, 'square', 0.045); tone(690, 0.045, 'triangle', 0.025); },
    mission() { unlock(); tone(520, 0.18, 'sine', 0.06); setTimeout(() => tone(780, 0.25, 'sine', 0.05), 90); },
    crime() { unlock(); tone(240, 0.14, 'sawtooth', 0.04); },
    update(car, wanted) {
      if (!ctx) return;
      const now = ctx.currentTime;
      const moving = car ? Math.min(0.12, Math.abs(car.speed) / 520 * 0.12) : 0;
      engineGain.gain.setTargetAtTime(moving, now, 0.15);
      engine.frequency.setTargetAtTime(car ? 48 + Math.abs(car.speed) * 0.19 : 48, now, 0.08);
      sirenGain.gain.setTargetAtTime(wanted ? 0.022 : 0, now, 0.25);
      sirenOsc.frequency.setTargetAtTime(560 + Math.sin(now * 3.8) * 220, now, 0.09);
    },
  };
}
