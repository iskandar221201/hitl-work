import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { join } from 'path';

const UPSTREAM = 'https://github.com/iskandar221201/hitl-work';
const LOCKFILE = '.hitlwork-lock.json';

export function lockfilePath(root) {
  return join(root, LOCKFILE);
}

export function readLockfile(root) {
  const path = lockfilePath(root);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf-8'));
}

export function writeLockfile(root, data) {
  const path = lockfilePath(root);
  const payload = {
    upstream: UPSTREAM,
    updated_at: new Date().toISOString(),
    agents: data.agents,
  };
  writeFileSync(path, JSON.stringify(payload, null, 2) + '\n', 'utf-8');
}

export function getHash(filepath) {
  const content = readFileSync(filepath);
  return createHash('sha256').update(content).digest('hex');
}

export { UPSTREAM };
