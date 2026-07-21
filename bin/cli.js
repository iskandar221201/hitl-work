#!/usr/bin/env node

import { Command } from 'commander';
import { initAction } from './commands/init.js';
import { updateAction } from './commands/update.js';
import { targetsAction } from './commands/targets.js';

const program = new Command();

program
  .name('hitl-work')
  .description('Multi-agent prompt distribution tool')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize agents for a target tool')
  .requiredOption('--target <name>', 'target tool name (e.g. claude-code, kiro, opencode)')
  .option('--agents <path>', 'path to agents folder', './agents')
  .option('--out <path>', 'output directory override')
  .option('--dry-run', 'preview output without writing files')
  .action((options) => {
    initAction(options.target, options);
  });

program
  .command('update')
  .description('Update agents from upstream')
  .option('--force', 'force overwrite all files, ignore local changes')
  .option('--dry-run', 'preview output without writing files')
  .action((options) => {
    updateAction(options);
  });

program
  .command('targets')
  .description('List all supported targets')
  .action(() => {
    targetsAction();
  });

program.parse(process.argv);
