import { updateAction as runUpdate } from '../updater.js';

export async function updateAction(options) {
  const root = process.cwd();
  await runUpdate(root, {
    force: options.force || false,
    dryRun: options.dryRun || false,
  });
}
