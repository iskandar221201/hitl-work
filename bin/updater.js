import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, cpSync, rmSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { getHash, readLockfile, writeLockfile, UPSTREAM } from './lockfile.js';

export async function updateAction(root, options) {
  const force = options.force || false;
  const dryRun = options.dryRun || false;

  const localDir = join(root, 'agents');
  const tmpDir = join(root, '.hitlwork-tmp');

  if (!dryRun) {
    if (existsSync(tmpDir)) rmSync(tmpDir, { recursive: true });
    mkdirSync(tmpDir, { recursive: true });

    const repoUrl = UPSTREAM.replace('https://github.com/', 'https://github.com/');
    execSync(`git clone --depth 1 ${repoUrl} ${tmpDir}`, { stdio: 'pipe' });
  }

  const upstreamDir = join(tmpDir, 'agents');
  const lock = readLockfile(root);

  const report = { updated: [], added: [], skipped: [], kept: [] };

  const upstreamFiles = dryRun
    ? getLocalFiles(localDir)
    : getLocalFiles(upstreamDir);

  const localFiles = getLocalFiles(localDir);
  const localNames = new Set(localFiles.map(f => f.name));

  for (const uf of upstreamFiles) {
    const localExists = localNames.has(uf.name);

    if (!localExists) {
      if (!dryRun) {
        const src = join(upstreamDir, uf.name);
        const dest = join(localDir, uf.name);
        writeFileSync(dest, readFileSync(src));
      }
      report.added.push(uf.name);
      continue;
    }

    if (force) {
      if (!dryRun) {
        const src = join(upstreamDir, uf.name);
        const dest = join(localDir, uf.name);
        writeFileSync(dest, readFileSync(src));
      }
      report.updated.push(uf.name);
      continue;
    }

    const localHash = getHash(join(localDir, uf.name));
    const storedHash = lock?.agents?.[uf.name];

    if (storedHash && localHash !== storedHash) {
      report.skipped.push(uf.name);
    } else {
      if (!dryRun) {
        const src = join(upstreamDir, uf.name);
        const dest = join(localDir, uf.name);
        writeFileSync(dest, readFileSync(src));
      }
      report.updated.push(uf.name);
    }
  }

  for (const lf of localFiles) {
    const inUpstream = upstreamFiles.some(uf => uf.name === lf.name);
    if (!inUpstream) {
      report.kept.push(lf.name);
    }
  }

  if (!dryRun) {
    const newLockAgents = {};
    const allAgents = readdirSync(localDir).filter(f => f.endsWith('.md'));
    for (const f of allAgents) {
      newLockAgents[f] = getHash(join(localDir, f));
    }
    writeLockfile(root, { agents: newLockAgents });

    rmSync(tmpDir, { recursive: true });
  }

  printReport(report, dryRun);
  return report;
}

function getLocalFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter(f => f.endsWith('.md'))
    .map(f => ({ name: f }));
}

function printReport(report, dryRun) {
  if (dryRun) console.log('\nDRY RUN — no files written\n');

  for (const f of report.updated) console.log(`✔ ${f} updated`);
  for (const f of report.added) console.log(`✔ ${f} added (new)`);
  for (const f of report.skipped) console.log(`⚠ ${f} skipped — local changes detected`);
  for (const f of report.kept) console.log(`ℹ ${f} removed from upstream — local copy kept`);

  const total = report.updated.length + report.added.length + report.skipped.length + report.kept.length;
  console.log(`\n${report.updated.length} updated, ${report.added.length} added, ${report.skipped.length} skipped, ${report.kept.length} kept.`);
}
