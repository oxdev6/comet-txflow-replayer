#!/usr/bin/env node
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { scanContracts } from '@copilot/core';
import { writeFile, readFile, readdir, stat, writeFile as fsWriteFile } from 'node:fs/promises';
import path from 'node:path';

async function commandScan(argv) {
  const root = path.resolve(process.cwd(), argv.target);
  const report = await scanContracts(root);
  await writeFile(path.resolve(process.cwd(), argv.out), JSON.stringify(report, null, 2));

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
}

async function collectFiles(dir, acc) {
  const entries = await readdir(dir);
  for (const e of entries) {
    const p = path.join(dir, e);
    const s = await stat(p);
    if (s.isDirectory()) {
      if (/node_modules|out|artifacts|\.git/.test(p)) continue;
      await collectFiles(p, acc);
    } else if (p.endsWith('.sol')) {
      acc.push(p);
    }
  }
}

async function commandApply(argv) {
  const root = path.resolve(process.cwd(), argv.target);
  const files = [];
  await collectFiles(root, files);
  let touched = 0;
  for (const file of files) {
    let text = await readFile(file, 'utf8');
    let next = text;
    if (argv.rule === 'ARBI-GASPRICE-001') {
      next = next.replace(/tx\.gasprice\b/g, '/* ARBITRUM: review gas usage on L2 */ tx.gasprice');
    } else if (argv.rule === 'ARBI-EVENT-LARGE-005') {
      next = next.replace(/(event\s+\w+\s*\([^)]*string[^)]*\)[^;]*;)/gi, '$1 // TODO: consider indexing large params on L2');
      next = next.replace(/(event\s+\w+\s*\([^)]*bytes(?!\d)[^)]*\)[^;]*;)/gi, '$1 // TODO: consider indexing large params on L2');
    } else {
      continue;
    }
    if (next !== text) {
      touched++;
      if (argv.write) {
        await fsWriteFile(file, next);
      } else {
        console.log(`[dry-run] would modify: ${file}`);
      }
    }
  }
  console.log(`Applied rule ${argv.rule} to ${touched} file(s)${argv.write ? '' : ' (dry-run)'}.`);
}

const y = yargs(hideBin(process.argv))
  .scriptName('copilot')
  .command(
    ['scan [target]', '$0'],
    'Scan solidity contracts and emit a report',
    y => y
      .positional('target', { type: 'string', default: '.', describe: 'Path to project root' })
      .option('out', { type: 'string', default: 'copilot-report.json', describe: 'Output JSON file' })
      .option('md', { type: 'string', default: 'copilot-report.md', describe: 'Output Markdown file' }),
    commandScan
  )
  .command(
    'apply [target]',
    'Apply safe autofixes for a specific rule id',
    y => y
      .positional('target', { type: 'string', default: '.', describe: 'Path to project root' })
      .option('rule', { type: 'string', demandOption: true, describe: 'Rule id to apply (e.g. ARBI-GASPRICE-001)' })
      .option('write', { type: 'boolean', default: false, describe: 'Write changes to disk (default: dry-run)' }),
    commandApply
  )
  .help();

await y.parseAsync();

