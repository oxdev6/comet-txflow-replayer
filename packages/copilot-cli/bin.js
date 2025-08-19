#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { scanContracts } from '@copilot/core';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

const argv = yargs(hideBin(process.argv))
  .scriptName('copilot')
  .command('$0 [target]', 'Scan solidity contracts and emit a report', y =>
    y.positional('target', { type: 'string', default: '.', describe: 'Path to project root' })
     .option('out', { type: 'string', default: 'copilot-report.json', describe: 'Output JSON file' })
     .option('md', { type: 'string', default: 'copilot-report.md', describe: 'Output Markdown file' })
  )
  .help()
  .parseSync();

const root = path.resolve(process.cwd(), argv.target);
const report = await scanContracts(root);
await writeFile(path.resolve(process.cwd(), argv.out), JSON.stringify(report, null, 2));

// Emit Markdown summary
const lines = [];
lines.push(`# Copilot Report`);
lines.push(`- schemaVersion: ${report.schemaVersion}`);
lines.push(`- createdAt: ${report.createdAt}`);
lines.push(`- total: ${report.summary.total} | blockers: ${report.summary.blockers} | majors: ${report.summary.majors} | minors: ${report.summary.minors} | infos: ${report.summary.infos}`);
lines.push('');
for (const f of report.findings) {
  lines.push(`## ${f.id} (${f.severity})`);
  lines.push(`- file: ${f.file}`);
  if (f.explanation) lines.push(`- explanation: ${f.explanation}`);
  if (f.arbitrumRationale) lines.push(`- arbitrum: ${f.arbitrumRationale}`);
  if (f.suggestedDiff) lines.push(`- suggestion: ${f.suggestedDiff}`);
  if (f.links && f.links.length) lines.push(`- links: ${f.links.join(', ')}`);
  lines.push('');
}
await writeFile(path.resolve(process.cwd(), argv.md), lines.join('\n'));

const exitCode = report.summary.blockers > 0 ? 2 : report.summary.majors > 0 ? 1 : 0;
process.exit(exitCode);

