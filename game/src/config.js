// Every tuning number, colour and name in one place: the city's own names and story, the cars,
// the people, the mission text and the art direction. Gameplay modules read these; nothing here
// touches the DOM.

/** The simulation runs at a fixed 60 steps a second. */
export const STEP = 1 / 60;

export const CITY = {
  name: 'San Aurelio',
  tagline: 'Sunshine. Palm trees. Expensive mistakes.',
  cols: 12,
  rows: 12,
  block: 300,
  road: 100,
  sidewalk: 24,
  beach: 260,
  ocean: 520,
};

export const PLAYER = {
  radius: 11,
  walkSpeed: 168,
  sprintSpeed: 252,
  accel: 14,
  turnRate: 14,
  maxHealth: 100,
  maxArmor: 100,
  respawnInvuln: 2.5,
};

export const WEAPONS = {
  pistol: { name: 'Vega 9', damage: 26, rate: 0.24, spread: 0.045, speed: 1150, range: 780, ammo: Infinity, pellets: 1, sound: 'pistol' },
  shotgun: { name: 'Coquina 12', damage: 18, rate: 0.75, spread: 0.16, speed: 980, range: 430, ammo: 24, pellets: 6, sound: 'shotgun' },
  smg: { name: 'Avispa SMG', damage: 13, rate: 0.085, spread: 0.11, speed: 1050, range: 620, ammo: 90, pellets: 1, sound: 'smg' },
};

export const VEHICLE_KINDS = [
  { id: 'marlin', name: 'Marlin GT', length: 54, width: 27, mass: 1, maxSpeed: 520, accel: 300, grip: 7.2, colors: ['#d94f45', '#2b8c8a', '#e8c27a', '#ece6da', '#34495e'] },
  { id: 'coral', name: 'Coral 88', length: 48, width: 25, mass: 0.9, maxSpeed: 440, accel: 260, grip: 6.6, colors: ['#e6a24a', '#7aa6c2', '#cf6f8e', '#ece6da', '#4e7a5e'] },
  { id: 'falcone', name: 'Falcone', length: 62, width: 30, mass: 1.25, maxSpeed: 470, accel: 250, grip: 6.0, colors: ['#2f3640', '#7b1f2b', '#d8d2c4', '#3a5a78'] },
  { id: 'burro', name: 'Burro Van', length: 66, width: 32, mass: 1.5, maxSpeed: 390, accel: 200, grip: 5.2, colors: ['#b8b2a4', '#5d7a63', '#8a6a52', '#cfd6da'] },
  { id: 'vespa', name: 'Nuevo Sprint', length: 44, width: 23, mass: 0.8, maxSpeed: 465, accel: 290, grip: 7.6, colors: ['#e4623c', '#4aa3a2', '#f1e3b8', '#7d8491'] },
  { id: 'brisa', name: 'Brisa Cabrio', length: 52, width: 27, mass: 0.95, maxSpeed: 500, accel: 285, grip: 7.0, colors: ['#f2f0e6', '#e78a78', '#63b6c8', '#c8b06a'] },
];

export const POLICE = {
  cruiserSpeed: 465,
  cruiserAccel: 255,
  cruiserGrip: 6.8,
  unitHealth: 150,
  officerHealth: 55,
  officerDamage: 9,
  officerRange: 430,
  officerRate: 0.9,
  starsForCrime: { shot: 1, ped: 2, cop: 3, car: 1, ram: 1, explosion: 2 },
  heatDecayDelay: 9,
  heatDecayRate: 1.5,
  maxStars: 5,
};

export const PED = {
  walkSpeed: 62,
  fleeSpeed: 168,
  radius: 9,
  health: 30,
  density: 58,
  fleeRadius: 230,
};

/** The cast: everyone and everything in San Aurelio is ours. */
export const CAST = {
  hero: { name: 'Milo Reyes', blurb: 'Back from the navy with a duffel bag and a debt.' },
  fixer: { name: 'Val Duvall', blurb: 'Runs the Palm Court garage. Pays in cash, never in answers.' },
  rival: { name: 'El Faro', blurb: 'Boss of the Coquina Cartel. Owns the docks and half the cops.' },
  detective: { name: 'Ines Marchetti', blurb: 'San Aurelio PD. Has your file open on her desk.' },
  dj: { name: 'Nova', blurb: 'Pirate radio, 98.3 Sol FM. Knows where every body is buried.' },
};

export const STREETS = {
  eastWest: ['Avenida Sol', 'Calle Mariposa', 'Boulevard Reyes', 'Calle del Puerto', 'Avenida Coral', 'Calle Lantana', 'Calle Ocho', 'Avenida Marina', 'Calle Ventosa', 'Boulevard Palma', 'Calle Tijera', 'Ruta del Faro', 'Paseo del Mar'],
  northSouth: ['Calle Uno', 'Calle Dos', 'Calle Tres', 'Avenida Quilla', 'Calle Esmeralda', 'Avenida Muelle', 'Calle Humo', 'Avenida Farol', 'Calle Sal', 'Calle Roca', 'Avenida Vista', 'Calle Ceniza', 'Paseo del Sol'],
};

export const DISTRICTS = {
  'Las Palmas': 'condos and palm shade',
  'Old Town': 'stone arcades, old money',
  'Midtown': 'offices and lunch counters',
  'Downtown': 'glass towers, cold coffee',
  'Sunset Strip': 'neon, clubs, bad decisions',
  'Marina': 'docks, yachts, sealed crates',
  'The Beach': 'sand, salt, no shade',
};

/** Warm golden-hour city: honeyed pavement, coral walls, teal water, long shadows. */
export const PALETTE = {
  backdrop: '#2a1f27',
  asphalt: '#4b4442',
  asphaltDark: '#413b39',
  asphaltLight: '#57504d',
  lane: '#e9dba9',
  crosswalk: '#efe5c6',
  sidewalk: '#d8c7a6',
  sidewalkLine: '#c2ad8c',
  curb: '#b39c78',
  grass: '#7d9a55',
  grassDark: '#648041',
  sand: '#e3cc95',
  sandDark: '#cfb47c',
  water: '#2d8f9b',
  waterDeep: '#1c6b7c',
  waterFoam: '#a7e3d8',
  plot: '#c9b795',
  shadow: 'rgba(38, 22, 36, 0.32)',
  window: '#9fd0d6',
  windowDark: '#3f6b76',
  roof: '#a8756a',
  trim: '#f1e6cf',
  neonPink: '#ff6f91',
  neonTeal: '#5ff0d8',
  gold: '#f5c451',
  blood: '#9e2a33',
  hudDark: 'rgba(28, 18, 26, 0.86)',
  hudPanel: 'rgba(37, 24, 33, 0.92)',
  hudLine: 'rgba(245, 196, 81, 0.5)',
  text: '#f8eeda',
  muted: '#c9b7a6',
  health: '#5fd8b0',
  armor: '#6fa8dc',
  danger: '#e2554e',
  money: '#f5d67a',
};

export const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';
export const FONT_DISPLAY = 'Impact, "Arial Black", "Trebuchet MS", sans-serif';

export const SAVE_KEY = 'san-aurelio.save.v1';

export const START = {
  money: 350,
  time: 18 * 60 + 12, // minutes past midnight: 18:12, golden hour
};

/** The chronicle: mission ids, beats and lines. Positions are resolved by world.js. */
export const STORY = {
  intro: 'Milo Reyes came home to San Aurelio with a clean record and no plan. Val Duvall had a plan.',
  missions: [
    {
      id: 'fresh-off-the-boat',
      title: 'Fresh Off the Boat',
      briefing: 'VAL: "Welcome home, sailor. My lot needs wheels. Take one off the marina and bring it to Palm Court. Try not to bleed on the upholstery."',
      objectives: ['Steal a car from the marina lot', 'Drive it to Palm Court garage'],
      reward: 250,
    },
    {
      id: 'bad-cargo',
      title: 'Bad Cargo',
      briefing: 'VAL: "Coquina put a crate on the docks that isn\'t theirs. Fetch it before the night market. If anyone objects, be persuasive."',
      objectives: ['Collect the crate at Pier 9', 'Lose the tail', 'Deliver the crate to the night market'],
      reward: 500,
    },
    {
      id: 'static-on-983',
      title: 'Static on 98.3',
      briefing: 'VAL: "Nova says the cartel is jamming her signal from the old radio tower. Go make some noise of your own."',
      objectives: ['Drive to the radio tower', 'Clear out the cartel crew', 'Escape the police'],
      reward: 900,
    },
    {
      id: 'night-shift',
      title: 'Night Shift',
      briefing: 'VAL: "Our friends at the casino need a driver who doesn\'t ask questions. Get the car, lose the cops, get paid."',
      objectives: ['Reach the casino garage', 'Steal the blue Falcone', 'Lose the police and return to Palm Court'],
      reward: 1600,
    },
    {
      id: 'the-operator',
      title: 'The Operator',
      briefing: 'VAL: "El Faro is at the marina tonight, on his boat. End it, Milo. Then get out of my city."',
      objectives: ['Drive to the marina', 'Take down El Faro', 'Escape San Aurelio'],
      reward: 5000,
      finale: true,
    },
  ],
};

/** Ambient radio lines and shop chatter, cycled as notification toasts. */
export const RADIO = [
  '98.3 SOL FM — "Another perfect day in San Aurelio, and someone is already on fire."',
  '98.3 SOL FM — "Traffic is bad on Avenida Farol. Also, the mayor is bad. Back to the music."',
  '98.3 SOL FM — "Sunset at 19:04. Bring a jacket you can run in."',
];

/** Floating street signage, placed by world.js on specific blocks. */
export const SIGNS = [
  { text: 'PALM COURT', sub: 'GARAGE', color: '#5ff0d8' },
  { text: 'PIER 9', sub: 'COQUINA DOCKS', color: '#f5c451' },
  { text: 'SOL FM', sub: '88.3 RADIO TOWER', color: '#ff6f91' },
  { text: 'CASA MIRAMAR', sub: 'CASINO', color: '#ffd166' },
  { text: 'NIGHT MARKET', sub: 'OPEN LATE', color: '#b9f18d' },
];
