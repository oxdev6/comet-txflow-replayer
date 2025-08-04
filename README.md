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

## Install

### Global (recommended)
```bash
npm install -g comet-txflow-replayer
comet-txflow --help
```

### Local / project usage
```bash
npm install --save-dev comet-txflow-replayer
npx comet-txflow --limit 5 --json
```

Make sure you have either `ALCHEMY_API_KEY` **or** any `ETH_RPC_URL` in your `.env` file so the replay can fetch on-chain data.

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

## CLI Usage Examples

The `replayTxFlow.js` script now supports multiple output and filtering modes via **yargs** flags:

| Flag | Purpose |
|------|---------|
| `--limit <n>` | Process only the first **n** transactions from `flow.json` |
| `--filter successful|failed` | Include **only** transactions whose receipt `status` matches (1 = successful, 0 = failed) |
| `--json` | Stream one JSON object per line (ND-JSON) to *stdout* — great for piping into other tools |
| `--quiet` | Suppress the colourful human-readable logs (still streams JSON if `--json` is set) |
| `--output <file>` | Write an **array** of processed tx objects to the given file |

### Quick recipes

```bash
# 1. Full forensic replay (verbose)
node replayTxFlow.js

# 2. First 5 transactions only
node replayTxFlow.js --limit 5

# 3. Only failed txs, no console noise
node replayTxFlow.js --filter failed --quiet

# 4. ND-JSON stream → jq
node replayTxFlow.js --json | jq -c .

# 5. Structured array written to disk
node replayTxFlow.js --limit 20 --output txs.json --quiet
```

Example verbose output:

```
🔍 [1] Tx: 0x...
   ⛓  Block: 23031...
   📨  From : 0x...
   📥  To   : 0x...
   🔎  Function: supply
   📤  ERC20 Transfers:
       0x... → 0x... : 123.45 tokens (0xTOKEN)
```

---

License
MIT — feel free to use, fork, and contribute.

