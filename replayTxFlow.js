require('dotenv').config();
const fs = require('fs');
const { Alchemy, Network } = require('alchemy-sdk');
const { ethers } = require('ethers');
const yargs = require('yargs');
const { hideBin } = require('yargs/helpers');

// Parse CLI flags
const argv = yargs(hideBin(process.argv))
  .option('json', {
    type: 'boolean',
    description: 'Output in JSON format',
  })
  .option('filter', {
    type: 'string',
    choices: ['failed', 'successful'],
    description: 'Filter transactions by status',
  })
  .option('limit', {
    type: 'number',
    description: 'Limit the number of transactions replayed',
  })
  .option('quiet', {
    type: 'boolean',
    description: 'Suppress verbose logging',
  })
  .help()
  .argv;

// Setup Alchemy
const alchemy = new Alchemy({
  apiKey: process.env.ALCHEMY_API_KEY || "E_rpHj3cSkfFjnpiqULx-", // fallback to fake key
  network: Network.ETH_MAINNET,
});

// Load transactions
const txData = JSON.parse(fs.readFileSync('flow.json', 'utf-8'));

// Comet + ERC20 ABIs
const cometAbi = [
  // Core supply & withdraw functions (Compound V3 / Comet)
  "function supply(address asset, uint256 amount)",
  "function withdraw(address asset, uint256 amount)",
  // Some older deploys used (to,value) naming but same signature → keep duplicate for clarity
  "function withdraw(address to, uint256 value)",
  // Permissioning helpers
  "function allow(address who, bool status)",
  // Standard ERC-20 style functions that sometimes show up
  "function transfer(address to, uint256 amount)",
  "function transferFrom(address from, address to, uint256 amount)",
  "function approve(address spender, uint256 amount)"
];
const iface = new ethers.Interface(cometAbi);

// ERC20 Transfer Event
const erc20Iface = new ethers.Interface([
  "event Transfer(address indexed from, address indexed to, uint256 value)"
]);
const transferTopic = erc20Iface.getEvent("Transfer").topicHash;

async function replayTxFlow() {
  if (!argv.quiet && !argv.json) {
    console.log(`\n🔁  Replaying ${txData.length} transactions…\n`);
  }

  const collected = [];
  const limit = argv.limit ?? txData.length;

  for (let i = 0; i < limit; i++) {
    const txHash = txData[i].hash;
    if (!argv.quiet && !argv.json) {
      console.log(`🔍 [${i + 1}] Tx: ${txHash}`);
    }

    try {
      const tx = await alchemy.core.getTransaction(txHash);
      const receipt = await alchemy.core.getTransactionReceipt(txHash);
      const block = await alchemy.core.getBlock(tx.blockNumber);

      const timestampIso = new Date(block.timestamp * 1e3).toISOString();
      const txInfo = {
        txHash,
        block: tx.blockNumber,
        timestamp: timestampIso,
        from: tx.from,
        to: tx.to,
        valueEth: ethers.formatEther(tx.value.toString()),
        gasUsed: receipt.gasUsed.toString(),
        status: receipt.status,
      };

      // Attempt decode
      let decoded;
      try {
        decoded = iface.parseTransaction({ data: tx.input || tx.data });
        txInfo.function = decoded.name;
        txInfo.args = Array.from(decoded.args, (v) => (typeof v === 'bigint' ? v.toString() : v));
      } catch {}

      // Filter flag handling
      if (argv.filter === 'failed' && receipt.status !== 0) continue;
      if (argv.filter === 'successful' && receipt.status !== 1) continue;

      if (argv.json) {
        console.log(JSON.stringify(txInfo, null, 2));
      }

      if (argv.output) {
        collected.push(txInfo);
      }

      if (!argv.quiet && !argv.json) {
        console.log(`   ⛓  Block: ${txInfo.block} (${txInfo.timestamp})`);
      console.log(`   📨  From : ${tx.from}`);
      console.log(`   📥  To   : ${tx.to}`);
      const valueEth = ethers.formatEther(tx.value.toString());
      console.log(`   💰  Value: ${valueEth} ETH`);
      console.log(`   ⛽  Gas  : ${receipt.gasUsed.toString()}`);

      if (decoded) {
        console.log(`   🔎  Function: ${decoded.name}`);
        decoded.args.forEach((arg, index) => console.log(`       Arg[${index}]: ${arg}`));
      } else {
        console.log(`   ⚠️  Could not decode input (non-matching ABI or fallback).`);
      }

      // Decode ERC20 Transfer logs
      const transferLogs = receipt.logs.filter(log => log.topics[0] === transferTopic);
      if (transferLogs.length) {
        console.log(`\n   📤  ERC20 Transfers:`);
        for (const log of transferLogs) {
          try {
            const parsed = erc20Iface.parseLog(log);
            const from = parsed.args.from;
            const to = parsed.args.to;
            const value = ethers.formatUnits(parsed.args.value.toString(), 18); // assume 18 decimals
            console.log(`       ${from} → ${to}: ${value} tokens (${log.address})`);
          } catch {
            console.log(`       ⚠️  Failed to parse log from ${log.address}`);
          }
        }
      }

      console.log(); // newline
    }
    } catch (err) {
      console.error(`   ❌  ${err.message}\n`);
    }
  }

  if (argv.output) {
    fs.writeFileSync(argv.output, JSON.stringify(collected, null, 2));
    if (!argv.quiet) console.log(`📝  Saved output to ${argv.output}`);
  }
}

replayTxFlow();
