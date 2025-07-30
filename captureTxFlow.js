const fs = require('fs');
const axios = require('axios');
require('dotenv').config();

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const COMET_CONTRACT_ADDRESS = '0xc3d688B66703497DAA19211EEdff47f25384cdc3'; // Compound USDCv3

const fetchTransactions = async () => {
  const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${COMET_CONTRACT_ADDRESS}&startblock=0&endblock=99999999&page=1&offset=20&sort=desc&apikey=${ETHERSCAN_API_KEY}`;

  try {
    const response = await axios.get(url);
    const txs = response.data.result;

    if (!txs || txs.length === 0) {
      console.log('No transactions found.');
      return;
    }

    fs.writeFileSync('flow.json', JSON.stringify(txs, null, 2));
    console.log(`✅ Saved ${txs.length} transactions to flow.json`);
  } catch (error) {
    console.error('Error fetching transactions:', error.message);
  }
};

fetchTransactions();
