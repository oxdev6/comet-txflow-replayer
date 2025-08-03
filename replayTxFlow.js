require('dotenv').config();
const fs = require('fs');
const { ethers } = require('ethers');

const rpcUrl = process.env.ETH_RPC_URL || `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY || 'demo'}`;
const provider = new ethers.JsonRpcProvider(rpcUrl);

const txData = JSON.parse(fs.readFileSync('flow.json', 'utf-8'));

const cometAbi = [
  "function supply(address asset, uint256 amount)",
  "function withdraw(address asset, uint256 amount)",
  "function transfer(address to, uint256 amount)",
  "function transferFrom(address from, address to, uint256 amount)",
  "function approve(address spender, uint256 amount)"
];
const iface = new ethers.Interface(cometAbi);

async function replayTxFlow() {
  const count = txData.length;
  console.log(`\n🔁  Replaying ${count} transactions…\n`);

  for (let i = 0; i < count; i++) {
    const txHash = txData[i].hash;
    console.log(`🔍 [${i + 1}] Tx: ${txHash}`);

    try {
      const tx = await provider.getTransaction(txHash);
      const receipt = await provider.getTransactionReceipt(txHash);
      const block = await provider.getBlock(tx.blockNumber);

      console.log(`   ⛓  Block: ${tx.blockNumber} (${new Date(block.timestamp * 1e3).toISOString()})`);
      console.log(`   📨  From : ${tx.from}`);
      console.log(`   📥  To   : ${tx.to}`);
      console.log(`   💰  Value: ${ethers.formatEther(tx.value)} ETH`);
      console.log(`   ⛽  Gas  : ${receipt.gasUsed.toString()}`);

      try {
        const decoded = iface.parseTransaction({ data: tx.input || tx.data });
        console.log(`\n   🔎  Decoded Call: ${decoded.name}`);
        decoded.args.forEach((arg, i) => {
          console.log(`       Arg[${i}]: ${arg}`);
        });
      } catch {
        console.log(`\n   ⚠️  Could not decode input.`);
      }

      console.log();
    } catch (err) {
      console.error(`   ❌  ${err.message}\n`);
    }
  }
}

replayTxFlow();
