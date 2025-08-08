#!/usr/bin/env tsx
import React from 'react';
import { render, Box, Text, useInput } from 'ink';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import meow from 'meow';
import { replayTxFlow } from './replayTxFlow.mjs';

const cli = meow(`
  Usage
    $ comet-txflow

  Options
    --from-block, -f  Starting block
    --to-block, -t    Ending block
    --limit, -l       Max transactions
    --json, -j        JSON output (disables TUI)

  Examples
    $ comet-txflow --limit 5
`, {
  importMeta: import.meta,
  flags: {
    fromBlock: {
      type: 'string',
      shortFlag: 'f',
    },
    toBlock: {
      type: 'string',
      shortFlag: 't',
    },
    limit: {
      type: 'number',
      shortFlag: 'l',
      default: 5
    },
    json: {
      type: 'boolean',
      shortFlag: 'j',
      default: false
    },
    noDashboard: {
      type: 'boolean',
      shortFlag: 'd',
      default: false
    },
    watch: {
      type: 'boolean',
      shortFlag: 'w',
      default: false
    },
    interval: {
      type: 'number',
      default: 10000
    },
    view: {
      type: 'string',
      default: 'expanded'
    },
    web: {
      type: 'boolean',
      default: false
    }
  }
});

// If JSON mode, print results and exit
if (cli.flags.json) {
  const run = async () => {
    const results = await replayTxFlow(cli.flags);
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(results, null, 2));
    process.exit(0);
  };
  run();
}

// Start web dashboard server unless disabled, or when --web is requested
if (!cli.flags.json && (!cli.flags.noDashboard || cli.flags.web)) {
  import('./server.js').catch(() => {});
}

// If --web, start Next.js dev server and open browser
if (!cli.flags.json && cli.flags.web) {
  const projectRoot = path.dirname(fileURLToPath(import.meta.url));
  const dashboardDir = path.join(projectRoot, 'web-dashboard');
  try {
    const nextProc = spawn('npm', ['run', 'dev', '--', '--port', '3000'], {
      cwd: dashboardDir,
      stdio: 'ignore',
      detached: true,
    });
    nextProc.unref();
  } catch {}
  try {
    // macOS open
    spawn('open', ['http://localhost:3000'], { stdio: 'ignore', detached: true }).unref();
  } catch {}
}

const TxDisplay = ({ tx }) => (
  <Box flexDirection="column" borderStyle="round" padding={1} marginBottom={1}>
    <Text>🔁 Tx Hash: {tx.txHash}</Text>
    <Text>📦 Block: {tx.block} | ⏱ {new Date(tx.timestamp).toLocaleString()}</Text>
    <Text>👤 From: {tx.from}</Text>
    <Text>➡️ To: {tx.to}</Text>
    <Text>⛽ Gas: {tx.gasUsed} | ✅ Status: {tx.status}</Text>
    <Text>🧠 Function: {tx.function}</Text>
    <Text>📥 Args: {JSON.stringify(tx.args)}</Text>
  </Box>
);

const formatNumber = (n) => new Intl.NumberFormat().format(Number(n));

const App = () => {
  const [txs, setTxs] = React.useState([]);
  const [viewMode, setViewMode] = React.useState(
    (cli.flags.view === 'minimal' || cli.flags.view === 'expanded') ? cli.flags.view : 'expanded'
  );
  const [showJson, setShowJson] = React.useState(false);

  React.useEffect(() => {
    const load = async () => {
      const results = await replayTxFlow(cli.flags);
      setTxs(results);
    };
    load();
    if (cli.flags.watch) {
      const id = setInterval(load, Number(cli.flags.interval) || 10000);
      return () => clearInterval(id);
    }
  }, []);

  useInput((input) => {
    const key = input.toLowerCase();
    if (key === 'm') setViewMode('minimal');
    if (key === 'e') setViewMode('expanded');
    if (key === 'r') {
      (async () => {
        const results = await replayTxFlow(cli.flags);
        setTxs(results);
      })();
    }
    if (key === 'j') setShowJson((v) => !v);
    if (key === 'q') process.exit(0);
  });

  const stats = React.useMemo(() => {
    const total = txs.length;
    const failed = txs.filter((t) => t.status !== 1).length;
    const totalGas = txs.reduce((acc, t) => {
      try { return acc + BigInt(t.gasUsed ?? 0); } catch { return acc; }
    }, 0n);
    return { total, failed, totalGas: totalGas.toString() };
  }, [txs]);

  return (
    <Box flexDirection="column">
      <Text color="cyanBright">📊 Comet TxFlow Replayer - TUI Mode</Text>
      <Text>
        Controls: [m]inimal [e]xpanded [r]efresh [j]SON toggle [q]uit | View: {viewMode} |
        Stats: total {stats.total}, failed {stats.failed}, gas {formatNumber(stats.totalGas)}
      </Text>
      {txs.length === 0 && <Text>⏳ Loading transactions...</Text>}
      {showJson ? (
        <Box borderStyle="round" padding={1} marginTop={1}>
          <Text>{JSON.stringify(txs, null, 2)}</Text>
        </Box>
      ) : (
        <>
          {viewMode === 'minimal' && (
            <Box flexDirection="column" marginTop={1}>
              {txs.map((tx, idx) => (
                <Text key={idx}>#{idx + 1} {tx.txHash.slice(0, 10)}… | {tx.function || 'unknown'} | blk {tx.block} | {new Date(tx.timestamp).toLocaleTimeString()}</Text>
              ))}
            </Box>
          )}
          {viewMode === 'expanded' && (
            <>
              {txs.map((tx, idx) => <TxDisplay key={idx} tx={tx} />)}
            </>
          )}
        </>
      )}
    </Box>
  );
};

if (!cli.flags.json) {
  render(<App />);
}


