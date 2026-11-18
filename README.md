# mrs02-gta6-game

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/DaviDSho18/mrs02-gta6-game/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/DaviDSho18/mrs02-gta6-game/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

**San Aurelio** — an original top-down open-world crime game for make.fun's *Make GTA 6* bounty.

Explore a sun-soaked coastal city on foot or by car, steal vehicles, dodge traffic and pedestrians,
commit crimes to raise a five-star wanted level, and outrun the police through a short mission chain.
Plain ES modules under `game/`, no build step, no network requests.

## Play

    node serve.ts            # serves game/ on http://localhost:8080

WASD to move, mouse to aim, click to fire, E to steal/enter a car, Space for the handbrake.

## Hand in

    mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

writes `out/dossier.json` from `game/` and `screenshots/`.
