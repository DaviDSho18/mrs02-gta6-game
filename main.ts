// San Aurelio hand-in: stage the playable game and its screenshots, then build the dossier.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repository = fileURLToPath(new URL('.', import.meta.url));
const destination = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const dossierCaps = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

function copyTree(sourceName: string, outputName: string): void {
  cpSync(join(repository, sourceName), join(destination, outputName), { recursive: true });
}

function main(): void {
  mkdirSync(destination, { recursive: true });
  copyTree('game', 'game');

  const screenshotOutput = join(destination, 'screenshots');
  mkdirSync(screenshotOutput, { recursive: true });
  if (existsSync(join(repository, 'screenshots'))) {
    copyTree('screenshots', 'screenshots');
  }

  const dossier = buildDossier(destination, dossierCaps);
  writeFileSync(join(destination, 'dossier.json'), dossier);
}

main();
