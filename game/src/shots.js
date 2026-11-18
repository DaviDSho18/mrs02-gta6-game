// Deterministic screenshot stage aliases. Main.js composes scenes from live city entities.
export const SHOT_SCENES = Object.freeze({
  start: 'title', title: 'title', cover: 'chase', chase: 'chase',
  play: 'walk', foot: 'walk', walk: 'walk', mission: 'mission',
  shootout: 'shootout', end: 'shootout',
});
