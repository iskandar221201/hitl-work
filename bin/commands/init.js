import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getGenerator } from '../../generators/index.js';
import { getHash, writeLockfile } from '../lockfile.js';

export async function initAction(target, options) {
  const root = process.cwd();
  const agentsDir = join(root, options.agents);
  const outDir = options.out || null;
  const dryRun = options.dryRun || false;

  if (!existsSync(agentsDir)) {
    console.error(`Error: agents folder not found at ${agentsDir}`);
    process.exit(1);
  }

  const agentFiles = readdirSync(agentsDir)
    .filter(f => f.endsWith('.md'))
    .sort();

  if (agentFiles.length === 0) {
    console.error(`Error: no .md files found in ${agentsDir}`);
    process.exit(1);
  }

  const gen = getGenerator(target);
  const finalOutDir = outDir || gen.defaultOutDir || `.${target}/commands`;

  const agents = agentFiles.map(name => ({
    name,
    content: readFileSync(join(agentsDir, name), 'utf-8'),
  }));

  const result = gen.generate(agents, finalOutDir, { dryRun });

  if (!dryRun) {
    const lockAgents = {};
    for (const f of agentFiles) {
      lockAgents[f] = getHash(join(agentsDir, f));
    }
    writeLockfile(root, { agents: lockAgents });
  }

  const fileCount = result.files.length;
  if (dryRun) {
    console.log(`\nDRY RUN — no files written\n`);
    console.log(`Target: ${target}`);
    console.log(`Output: ${finalOutDir}`);
    console.log(`Files: ${fileCount}\n`);
    for (const f of result.files) {
      console.log(`  ${f.path}`);
      if (f.preview) {
        console.log(f.preview);
      }
    }
    console.log(`\nDRY RUN — no files written`);
  } else {
    console.log(`\nGenerated ${fileCount} files for ${target}:`);
    for (const f of result.files) {
      console.log(`  ✔ ${f.path}`);
    }
    console.log(`\nOutput: ${finalOutDir}`);
  }
}
