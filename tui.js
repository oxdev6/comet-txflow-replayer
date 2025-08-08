#!/usr/bin/env node
import React from 'react';
import { render, Box, Text } from 'ink';
import meow from 'meow';
import { replayTxFlow } from './replayTxFlow.js';

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
      alias: 'f',
    },
    toBlock: {
      type: 'string',
      alias: 't',
    },
    limit: {
      type: 'number',
      alias: 'l',
      default: 5
    },
    json: {
      type: 'boolean',
      alias: 'j',
      default: false
    }
  }
});

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

const App = () => {
  const [txs, setTxs] = React.useState([]);

  React.useEffect(() => {
    const load = async () => {
      const results = await replayTxFlow(cli.flags);
      setTxs(results);
    };
    load();
  }, []);

  return (
    <Box flexDirection="column">
      <Text color="cyanBright">📊 Comet TxFlow Replayer - TUI Mode</Text>
      {txs.length === 0 && <Text>⏳ Loading transactions...</Text>}
      {txs.map((tx, idx) => <TxDisplay key={idx} tx={tx} />)}
    </Box>
  );
};

if (!cli.flags.json) {
  render(<App />);
}
