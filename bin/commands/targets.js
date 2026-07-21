import { listTargets } from '../../generators/index.js';

export async function targetsAction() {
  const targets = listTargets();

  if (targets.length === 0) {
    console.log('No targets registered.');
    return;
  }

  console.log('Available targets:\n');
  for (const t of targets) {
    const out = t.defaultOutDir || '(default)';
    console.log(`  ${t.name.padEnd(20)} ${t.description}`);
  }
}
