import express from "express";
import { db } from "./db/index.ts";
import { companies } from "./db/schema.ts";
import { config } from 'dotenv';
import { campaignRouter } from './routes/campaign.ts';
import "./queues/robocallQueue";
import "./queues/statusCheckQueue";
import "./queues/webhookQueue";
import { stopRobocall } from "./queues/robocallQueue.ts";
import { stopStatusCheck } from "./queues/statusCheckQueue.ts";
import { stopWebhook } from "./queues/webhookQueue.ts";
import { morganMiddleware } from "./utils/logger.ts";

config({ path: '.env' });
const app = express();
app.use(express.json());
app.use(morganMiddleware);

app.use('/campaigns', campaignRouter);

app.get("/health", async (req, res) => {
  try {
    await db.select().from(companies).limit(1);
    res.status(200).json({ status: "OK" });
  } catch (error) {
    res.status(500).json({ error: "Database connection failed" });
  }
});

const port = process.env.PORT;
const server = app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// Graceful shutdown
const performShutdown = async () => {
  console.log('Initiating graceful shutdown...');
  try {
    console.log('Attempting to stop Webhook queue...');
    await stopWebhook();
    console.log('Webhook queue stopped.');

    console.log('Attempting to stop Status Check queue...');
    await stopStatusCheck();
    console.log('Status Check queue stopped.');

    console.log('Attempting to stop Robocall queue...');
    await stopRobocall();
    console.log('Robocall queue stopped.');

  } catch (error) {
    console.error('Error during queue shutdown:', error);
  }

  return new Promise<void>((resolve, reject) => {
    server.close((err) => {
      if (err) {
        console.error('Error closing HTTP server:', err);
        reject(err); // Reject if server close fails
      } else {
        console.log('HTTP server closed.');
        resolve();
      }
    });
  });
};

process.on('SIGINT', async () => {
  console.log('SIGINT received. Shutting down gracefully...');
  try {
    await performShutdown();
    console.log('Graceful shutdown complete. Exiting process.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to shutdown gracefully on SIGINT:', error);
    process.exit(1); // Exit with error code
  }
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  try {
    await performShutdown();
    console.log('Graceful shutdown complete. Exiting process.');
    process.exit(0);
  } catch (error) {
    console.error('Failed to shutdown gracefully on SIGTERM:', error);
    process.exit(1); // Exit with error code
  }
});

// Handle nodemon restarts
process.once('SIGUSR2', async () => {
  console.log('SIGUSR2 received (nodemon restart). Shutting down gracefully...');
  try {
    await performShutdown();
    console.log('Graceful shutdown for nodemon complete. Re-signaling SIGUSR2.');
    // Signal nodemon that the process is ready to be killed and restarted
    process.kill(process.pid, 'SIGUSR2');
  } catch (error) {
    console.error('Failed to shutdown gracefully on SIGUSR2:', error);
    // If shutdown fails, we might still want nodemon to restart,
    // or exit with an error to prevent a broken state.
    // Forcing nodemon to restart by re-signaling:
    process.kill(process.pid, 'SIGUSR2');
    // Optionally, exit with an error code if preferred: process.exit(1);
  }
});