# hitl-work

Multi-agent prompt distribution tool. Maintain agent prompts once, generate command files for any AI agent CLI.

## Problem

Claude Code, Kiro, OpenCode, and other AI agent CLIs each use different file paths for custom commands. Without a distribution tool, you manually duplicate prompts across tools.

## Solution

`hitl-work` reads prompts from a single `agents/` folder and generates the correct output for your target tool.

```
agents/              ← source of truth (one .md per agent)
├── architect.md
├── coder.md
└── ...
```

## Install

```bash
npm install
```

## Usage

```bash
# Generate files for Claude Code
node bin/cli.js init --target claude-code

# Preview output without writing
node bin/cli.js init --target claude-code --dry-run

# Custom output directory
node bin/cli.js init --target claude-code --out /custom/path

# List all supported targets
node bin/cli.js targets

# Update agents from upstream
node bin/cli.js update
```

## Supported Targets

| Target | Output Path |
|---|---|
| `claude-code` | `.claude/commands/` |
| `kiro` | `.kiro/steering/` |
| `opencode` | `.opencode/prompts/` |

## Adding a Target

Create a file in `generators/`:

```js
export default {
  name: 'my-tool',
  description: 'My Tool CLI',
  defaultOutDir: '.my-tool/commands',
  generate(agents, outDir, options = {}) {
    // agents: [{ name, content }]
    // Write files to outDir
    return { target: 'my-tool', files: [...] };
  }
};
```

No changes to registry — auto-discovered.

## Project Structure

```
hitl-work/
├── agents/              ← example prompts (shipped)
├── base/                ← source prompts (local, not tracked)
├── bin/
│   ├── cli.js           ← entry point
│   ├── commands/        ← command handlers
│   ├── lockfile.js      ← lockfile utilities
│   └── updater.js       ← update mechanism
├── generators/          ← target generators (auto-discovered)
│   ├── index.js
│   ├── claude-code.js
│   ├── kiro.js
│   └── opencode.js
└── package.json
```

## License

MIT
