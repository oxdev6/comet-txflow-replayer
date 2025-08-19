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
  // Choose provider: prefer ETH_RPC_URL if provided; otherwise use Alchemy
  const rpcUrl = process.env.ETH_RPC_URL;
  const useRpc = typeof rpcUrl === 'string' && rpcUrl.length > 0;
  const provider = useRpc
    ? new ethers.JsonRpcProvider(rpcUrl)
    : new Alchemy({
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
      const tx = useRpc ? await provider.getTransaction(txHash) : await provider.core.getTransaction(txHash);
      const receipt = useRpc ? await provider.getTransactionReceipt(txHash) : await provider.core.getTransactionReceipt(txHash);
      const rawBlockNum = tx?.blockNumber ?? raw.blockNumber ?? raw.block;
      const numericBlock = typeof rawBlockNum === 'string' ? Number(rawBlockNum) : Number(rawBlockNum);
      const block = useRpc ? await provider.getBlock(numericBlock) : await provider.core.getBlock(numericBlock);

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
      // Fallback: return minimal info from flow.json so the UI can still render
      try {
        const fallback = {
          txHash,
          block: Number(raw.blockNumber ?? raw.block) || undefined,
          timestamp: (() => {
            const ts = Number(raw.timeStamp || raw.timestamp);
            return Number.isFinite(ts) ? new Date(ts * 1e3).toISOString() : undefined;
          })(),
          from: raw.from,
          to: raw.to,
          valueEth: (() => {
            try { return ethers.formatEther(BigInt(raw.value || '0')); } catch { return '0'; }
          })(),
          gasUsed: String(raw.gasUsed || ''),
          status: (() => {
            if (raw.txreceipt_status != null) return Number(raw.txreceipt_status);
            if (raw.isError != null) return raw.isError === '0' ? 1 : 0;
            return undefined;
          })(),
          function: raw.functionName || undefined,
        };
        results.push({ ...fallback, error: err?.message || String(err) });
      } catch {
        results.push({ txHash, error: err?.message || String(err) });
      }
    }
  }

  return results;
}


