require('dotenv').config();
const { ethers } = require('ethers');
const axios = require('axios');

// 🪙 Local token metadata
const tokenMap = {
  '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': {
    name: 'USD Coin',
    symbol: 'USDC',
    decimals: 6,
    coingeckoId: 'usd-coin'
  },
  '0xC02aaA39b223FE8D0A0E5C4F27eAD9083C756Cc2': {
    name: 'Wrapped Ether',
    symbol: 'WETH',
    decimals: 18,
    coingeckoId: 'weth'
  },
  '0x6B175474E89094C44Da98b954EedeAC495271d0F': {
    name: 'Dai Stablecoin',
    symbol: 'DAI',
    decimals: 18,
    coingeckoId: 'dai'
  },
  // Add more tokens here as needed
};

// 📈 Fetch token price from CoinGecko
async function fetchTokenPrice(id) {
  try {
    const res = await axios.get(
      `https://api.coingecko.com/api/v3/simple/price?ids=${id}&vs_currencies=usd`
    );
    return res.data[id]?.usd || 0;
  } catch (err) {
    console.warn(`⚠️ Price fetch failed for ${id}`);
    return 0;
  }
}

// 🧪 Transaction hash
const txHash = '0xba2978deb62ce788bc28574a5d198ddf7409018dcac7a2fc7d7625b178acb07b';

(async () => {
  const provider = new ethers.JsonRpcProvider(process.env.ETH_RPC_URL);
  const tx = await provider.getTransaction(txHash);
  const receipt = await provider.getTransactionReceipt(txHash);

  const iface = new ethers.Interface([
    'function supply(address asset, uint256 amount)',
    'event Transfer(address indexed from, address indexed to, uint256 value)',
    'event Supply(address indexed from, address indexed to, uint256 amount)'
  ]);

  console.log(`🔍 TX HASH: ${txHash}`);
  console.log(`📨 From: ${tx.from}`);
  console.log(`📥 To:   ${tx.to}`);
  console.log(`💰 Value: ${ethers.formatEther(tx.value)} ETH`);
  console.log(`⛽ Gas Used: ${receipt.gasUsed.toString()}\n`);

  try {
    const decoded = iface.parseTransaction({ data: tx.data });
    const [asset, rawAmount] = decoded.args;
    const token = tokenMap[asset.toLowerCase()];

    let amountFormatted = rawAmount.toString();
    let usdValue = '?';

    if (token) {
      const price = await fetchTokenPrice(token.coingeckoId);
      const amount = Number(rawAmount) / 10 ** token.decimals;
      usdValue = (amount * price).toFixed(2);
      amountFormatted = `${amount} ${token.symbol}`;
    }

    console.log(`🧠 Function: ${decoded.name}`);
    console.log(`📦 Args:`);
    console.log(`  → Asset: ${asset}`);
    console.log(`  → Amount: ${amountFormatted}`);
    console.log(`  → ≈ $${usdValue} USD`);
  } catch (e) {
    console.error('❌ Could not decode function input:', e.message);
  }

  console.log(`\n📡 Events:`);
  for (const log of receipt.logs) {
    try {
      const parsed = iface.parseLog(log);
      console.log(`🔔 Event: ${parsed.name}`);
      console.log(`Result(${parsed.args.length})`, parsed.args);
    } catch {} // ignore logs that can't be parsed
  }
})();
