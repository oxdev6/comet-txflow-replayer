# comet-txflow-replayer
Transaction capture and replay toolkit for Compound III (Comet) forensic analysis.
# Comet TxFlow Replayer

A transaction capture and replay toolkit for forensic analysis of Compound III (Comet) protocol activity.

## Setup

1. Install dependencies:

```bash
npm install
# Comet TxFlow Replayer

**Comet TxFlow Replayer** is a transaction capture and forensic replay toolkit for the [Compound III (Comet)](https://compound.finance/docs/#compound-iii) protocol. It helps developers and researchers inspect and analyze on-chain activity by downloading, parsing, and saving real Ethereum transaction flows.

---

 What It Does

- Pulls recent Ethereum transactions targeting Compound III contracts
- Saves transaction metadata to a local `flow.json` file
- Designed to support decoding and simulation of tx flows
- Modular base for building protocol tooling or research pipelines

---

##  Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/comet-txflow-replayer.git
cd comet-txflow-replayer
2. Install Dependencies
bash
Copy
Edit
npm install
3. Add Your Etherscan API Key
Create a file named .env in the project root:

env
Copy
Edit
ETHERSCAN_API_KEY=your_key_here
You can get a free key from etherscan.io

▶Usage
Run the capture script:

bash
Copy
Edit
node captureTxFlow.js
This will create a flow.json file with the latest Compound III transactions.

Project Structure
bash
Copy
Edit
comet-txflow-replayer/
├── captureTxFlow.js    # Main transaction fetcher
├── flow.json           # Output: latest fetched txs
├── .env                # Your Etherscan API key (not committed)
└── README.md           # Project overview and instructions
Future Features (Planned)
Input data decoding (ABI decoding)

Tx replay with simulated state traces

Protocol-specific action labeling

Web-based explorer or CLI visualization

License
MIT — feel free to use, fork, and contribute.

