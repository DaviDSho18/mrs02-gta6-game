// Three connected jobs for Val Duvall, with location markers, clear stage changes and cash rewards.
import { STORY } from './config.js';
import { aliveCrew, spawnCrew } from './pedestrians.js';
import { addCrime } from './police.js';

export function createMissions(random) {
  return { index: 0, stage: 0, random, crew: [], crate: false, completed: false, toast: STORY.intro, toastTimer: 6, elapsed: 0 };
}
export function currentMission(state) { return state.index < STORY.missions.length ? STORY.missions[state.index] : null; }
export function objective(state, world) {
  const m = currentMission(state);
  if (!m) return { title: 'Free roam', text: 'The city is yours. Find another story on 98.3 Sol FM.', marker: null, action: '' };
  if (state.index === 0) return state.stage === 0
    ? { title: m.title, text: 'Steal a car from Coquina Marina', marker: world.landmark('marina'), action: 'E  STEAL / ENTER' }
    : { title: m.title, text: 'Deliver the car to Palm Court Garage', marker: world.landmark('garage'), action: 'DRIVE TO GARAGE' };
  if (state.index === 1) {
    if (state.stage === 0) return { title: m.title, text: 'Collect the sealed crate at Pier 9', marker: world.landmark('docks'), action: 'E  COLLECT CRATE' };
    if (state.stage === 1) return { title: m.title, text: 'Lose the tail before the night market', marker: world.landmark('market'), action: 'BREAK LINE OF SIGHT' };
    return { title: m.title, text: 'Deliver the crate to the night market', marker: world.landmark('market'), action: 'DRIVE TO MARKET' };
  }
  if (state.stage === 0) return { title: m.title, text: 'Reach the Sol FM radio tower', marker: world.landmark('tower'), action: 'GO TO THE TOWER' };
  if (state.stage === 1) return { title: m.title, text: `Clear out the Coquina crew  ·  ${aliveCrew(state.crew).length} LEFT`, marker: world.landmark('tower'), action: 'CLICK TO AIM & FIRE' };
  return { title: m.title, text: 'Escape the police and leave the tower district', marker: world.landmark('tower'), action: 'LOSE THE TAIL' };
}
function announce(state, text, seconds = 4) { state.toast = text; state.toastTimer = seconds; }
function advance(state, player, message) {
  const m = currentMission(state);
  if (m) player.money += m.reward;
  announce(state, message, 5);
  state.index += 1; state.stage = 0;
  if (state.index >= STORY.missions.length) { state.completed = true; announce(state, 'THE CITY REMEMBERS. Val says there is always another job.', 7); }
}
export function updateMissions(state, player, world, police, people, input, dt, onCrate = () => {}) {
  state.elapsed += dt; state.toastTimer = Math.max(0, state.toastTimer - dt);
  const m = currentMission(state);
  if (!m) return;
  const dist = (key) => { const p = world.landmark(key); return Math.hypot(player.x - p.x, player.y - p.y); };
  if (state.index === 0) {
    if (state.stage === 0 && player.vehicle) {
      state.stage = 1; announce(state, 'VAL: “Nice wheels. Palm Court, two blocks west. Keep it shiny.”');
    } else if (state.stage === 1 && player.vehicle && dist('garage') < 142) {
      advance(state, player, 'JOB PAID  +$250  ·  “Now we can talk about the crate.”');
    }
  } else if (state.index === 1) {
    if (state.stage === 0 && dist('docks') < 118 && player.interactPulse) {
      state.stage = 1; state.crate = true; onCrate(); addCrime(police, 1);
      announce(state, 'VAL: “That seal is hot. Take the long way; the marina has eyes.”');
    } else if (state.stage === 1 && police.stars === 0) {
      state.stage = 2; announce(state, 'TAIL LOST. The night market is waiting.');
    } else if (state.stage === 2 && dist('market') < 128) {
      state.crate = false; advance(state, player, 'JOB PAID  +$500  ·  NOVA: “Tower crew is jamming Sol FM.”');
    }
  } else if (state.index === 2) {
    if (state.stage === 0 && dist('tower') < 145) {
      state.crew = spawnCrew(world, state.random, world.landmark('tower'));
      state.stage = 1; announce(state, 'VAL: “Milo, that is not a radio maintenance crew. Make your point.”');
    } else if (state.stage === 1 && aliveCrew(state.crew).length === 0) {
      state.stage = 2; addCrime(police, 2); announce(state, 'SOL FM IS BACK ON AIR. Now lose the sirens.');
    } else if (state.stage === 2 && police.stars === 0) {
      advance(state, player, 'JOB PAID  +$900  ·  NOVA: “San Aurelio is yours tonight.”');
    }
  }
}
