import express from 'express';
import cors from 'cors';
import { replayTxFlow } from './replayTxFlow.mjs';

const app = express();
const port = Number(process.env.PORT) || 3001;

app.use(cors());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.get('/api/transactions', async (req, res) => {
  const { fromBlock, toBlock, limit } = req.query;
  const flags = {
    fromBlock: fromBlock ? Number(fromBlock) : undefined,
    toBlock: toBlock ? Number(toBlock) : undefined,
    limit: limit ? parseInt(limit) : 5,
  };

  const result = await replayTxFlow(flags);
  res.json(result);
});

app.listen(port, () => {
  console.log(`🚀 Express server running at http://localhost:${port}`);
});
