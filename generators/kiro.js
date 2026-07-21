import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

export default {
  name: 'kiro',
  description: 'Kiro CLI',
  defaultOutDir: '.kiro/steering',
  generate(agents, outDir, options = {}) {
    const { dryRun } = options;

    if (!dryRun) {
      mkdirSync(outDir, { recursive: true });
    }

    const files = agents.map(agent => {
      const filePath = join(outDir, agent.name);

      if (dryRun) {
        const preview = agent.content.split('\n').slice(0, 5).join('\n');
        return {
          name: agent.name,
          path: filePath,
          status: 'preview',
          preview: `\n--- ${agent.name} ---\n${preview}\n---\n`,
        };
      }

      writeFileSync(filePath, agent.content, 'utf-8');
      return { name: agent.name, path: filePath, status: 'generated' };
    });

    return { target: 'kiro', files };
  }
};
