import 'dotenv/config';
import fs from 'fs';
import { Alchemy, Network } from 'alchemy-sdk';
import { ethers } from 'ethers';

const cometAbi = [
  'function supply(address asset, uint256 amount)',
  'function withdraw(address asset, uint256 amount)',
  'function withdraw(address to, uint256 value)',
  'function allow(address who, bool status)',
  'function transfer(address to, uint256 amount)',
  'function transferFrom(address from, address to, uint256 amount)',
  'function approve(address spender, uint256 amount)'
];
const cometInterface = new ethers.Interface(cometAbi);
const erc20Interface = new ethers.Interface([
  'event Transfer(address indexed from, address indexed to, uint256 value)'
]);
const transferTopic = erc20Interface.getEvent('Transfer').topicHash;

export async function replayTxFlow(flags = {}) {
  const alchemy = new Alchemy({
    apiKey: process.env.ALCHEMY_API_KEY || 'E_rpHj3cSkfFjnpiqULx-',
    network: Network.ETH_MAINNET,
  });

  const txData = JSON.parse(fs.readFileSync('flow.json', 'utf-8'));
  const results = [];

  const fromBlock = flags.fromBlock;
  const toBlock = flags.toBlock;
  const limit = typeof flags.limit === 'number' ? flags.limit : txData.length;

  for (let i = 0, seen = 0; i < txData.length && seen < limit; i++) {
    const raw = txData[i];
    if ((fromBlock && raw.blockNumber < fromBlock) || (toBlock && raw.blockNumber > toBlock)) {
      continue;
    }
    seen++;

    const txHash = raw.hash;
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
        valueEth: ethers.formatEther(tx.value?.toString?.() ?? '0'),
        gasUsed: receipt.gasUsed?.toString?.() ?? '0',
        status: receipt.status,
      };

      try {
        const decoded = cometInterface.parseTransaction({ data: tx.input || tx.data });
        txInfo.function = decoded.name;
        txInfo.args = Array.from(decoded.args, v => (typeof v === 'bigint' ? v.toString() : v));
      } catch {}

      const transferLogs = receipt.logs?.filter?.(log => log.topics?.[0] === transferTopic) ?? [];
      if (transferLogs.length) {
        txInfo.transfers = [];
        for (const log of transferLogs) {
          try {
            const parsed = erc20Interface.parseLog(log);
            txInfo.transfers.push({
              from: parsed.args.from,
              to: parsed.args.to,
              value: ethers.formatUnits(parsed.args.value?.toString?.() ?? '0', 18),
              token: log.address,
            });
          } catch {}
        }
      }

      results.push(txInfo);
    } catch (err) {
      results.push({ txHash, error: err?.message || String(err) });
    }
  }

  return results;
}


