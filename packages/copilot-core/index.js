import fg from 'fast-glob';
import { readFile } from 'node:fs/promises';

export function createReport() {
  return {
    schemaVersion: '0.1.0',
    createdAt: new Date().toISOString(),
    findings: [],
    summary: { total: 0, blockers: 0, majors: 0, minors: 0, infos: 0 },
  };
}

export function addFinding(report, finding) {
  report.findings.push(finding);
  report.summary.total++;
  if (finding.severity === 'blocker') report.summary.blockers++;
  else if (finding.severity === 'major') report.summary.majors++;
  else if (finding.severity === 'minor') report.summary.minors++;
  else report.summary.infos++;
}

export async function scanContracts(rootDir) {
  const patterns = [
    '**/*.sol',
  ];
  const entries = await fg(patterns, { cwd: rootDir, absolute: true, ignore: ['**/node_modules/**', '**/out/**', '**/artifacts/**'] });
  const report = createReport();

  for (const file of entries) {
    // Simple heuristic rules v0
    const content = await readFile(file, 'utf8');
    // 1) tx.gasprice usage (L1-centric pattern)
    if (/tx\.gasprice\b/i.test(content)) {
      addFinding(report, {
        id: 'ARBI-GASPRICE-001',
        severity: 'major',
        file,
        explanation: 'Usage of tx.gasprice is L1-centric; prefer L2-aware gas estimation and base fee handling on Arbitrum.',
        arbitrumRationale: 'Nitro fee model differs; assumptions about gas price can be misleading.',
        suggestedDiff: 'Replace tx.gasprice derivations with explicit fee configuration via toolchain or oracle.',
        links: ['https://docs.arbitrum.io/']
      });
    }

    // 2) block.basefee usage (L1 fee assumption)
    if (/block\.basefee\b/i.test(content)) {
      addFinding(report, {
        id: 'ARBI-BASEFEE-002',
        severity: 'major',
        file,
        explanation: 'Usage of block.basefee may not reflect L2 fee semantics; avoid hardcoding fee logic.',
        arbitrumRationale: 'L2 fee calculus differs from L1; basefee semantics may diverge.',
        suggestedDiff: 'Use toolchain fee estimation or L2-specific guidance instead of direct basefee reads.',
        links: ['https://docs.arbitrum.io/']
      });
    }

    // 3) selfdestruct usage (deprecated/blocked)
    if (/(selfdestruct|suicide)\b/i.test(content)) {
      addFinding(report, {
        id: 'ARBI-SELFDESTRUCT-003',
        severity: 'blocker',
        file,
        explanation: 'selfdestruct is deprecated and restricted; migration should remove or refactor.',
        arbitrumRationale: 'L2 systems restrict or break semantics of selfdestruct; unsafe to rely on.',
        suggestedDiff: 'Remove selfdestruct; model upgrade or kill-switch via access control flags.',
        links: ['https://eips.ethereum.org/EIPS/eip-6049']
      });
    }

    // 4) block.number for timing (advisory)
    if (/block\.number\b/i.test(content)) {
      addFinding(report, {
        id: 'ARBI-BLOCKNUMBER-004',
        severity: 'minor',
        file,
        explanation: 'block.number used for timing; prefer timestamp-based checks and avoid tight coupling.',
        arbitrumRationale: 'Block cadence differs on L2; tying logic to block numbers can be brittle.',
        suggestedDiff: 'Use block.timestamp with tolerances or off-chain scheduling when possible.',
        links: ['https://docs.arbitrum.io/']
      });
    }

    // 5) Events with large dynamic types without indexing (gas/log size advisory)
    const eventRegex = /event\s+\w+\s*\(([^)]*)\)/g;
    let m;
    while ((m = eventRegex.exec(content)) !== null) {
      const params = m[1];
      const hasLarge = /(string|bytes(?!\d))/i.test(params);
      const hasIndexed = /indexed/i.test(params);
      if (hasLarge && !hasIndexed) {
        addFinding(report, {
          id: 'ARBI-EVENT-LARGE-005',
          severity: 'minor',
          file,
          explanation: 'Event includes string/bytes parameters without indexing; logs may be large and costly.',
          arbitrumRationale: 'L2 calldata and log costs matter; indexing improves queryability and can reduce payloads.',
          suggestedDiff: 'Mark key parameters as indexed or avoid emitting large dynamic data in events.',
          links: ['https://docs.soliditylang.org/en/latest/abi-spec.html#events']
        });
      }
    }
  }
  return report;
}

