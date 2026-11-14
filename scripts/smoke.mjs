import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const outputDir = await mkdtemp(join(tmpdir(), 'sessiondiff-smoke-'));
try {
  for (const [name, args] of [
    ['compare', ['compare', 'tests/fixtures/before.log', 'tests/fixtures/after.jsonl', '--format', 'json']],
    ['summarize', ['summarize', 'tests/fixtures/tool-blocks.log', '--format', 'markdown']],
  ]) {
    const result = spawnSync(process.execPath, ['dist/src/cli.js', ...args], { encoding: 'utf8' });
    if (result.status !== 0) {
      process.stderr.write(result.stderr);
      process.exitCode = result.status ?? 1;
      break;
    }
    const { writeFile } = await import('node:fs/promises');
    await writeFile(join(outputDir, `${name}.${name === 'compare' ? 'json' : 'md'}`), result.stdout);
  }
} finally {
  await rm(outputDir, { recursive: true, force: true });
}
