import { readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const generators = new Map();

async function discoverGenerators() {
  const files = readdirSync(__dirname).filter(
    f => f.endsWith('.js') && f !== 'index.js'
  );

  for (const file of files) {
    const modulePath = pathToFileURL(join(__dirname, file)).href;
    const mod = await import(modulePath);

    const gen = mod.default || mod;

    if (!gen.name || !gen.description || typeof gen.generate !== 'function') {
      throw new Error(
        `Generator ${file} missing required interface: name (string), description (string), generate (function)`
      );
    }

    generators.set(gen.name, gen);
  }
}

await discoverGenerators();

export function getGenerator(target) {
  const gen = generators.get(target);
  if (!gen) {
    const available = [...generators.keys()].join(', ') || '(none registered)';
    throw new Error(`Unknown target: ${target}. Available targets: ${available}`);
  }
  return gen;
}

export function listTargets() {
  return [...generators.values()].map(g => ({
    name: g.name,
    description: g.description,
    defaultOutDir: g.defaultOutDir || null,
  }));
}
