import { Queue, Worker } from "bullmq";
import axios from "axios";
import { db } from "../db/index.ts";
import { callStatuses } from "../db/schema.ts";
import { eq } from "drizzle-orm";
import logger from "../utils/logger.ts";

const redisConfig = { host: "localhost", port: 6379 };

export const statusCheckQueue = new Queue("status-check", {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
  },
});

const worker = new Worker(
  "status-check",
  async (job) => {
    const { transactionId } = job.data;
    
    const response = await axios.post("http://172.28.17.17:8000/CallStatus", {
      transactionId,
    });

    // Update call_statuses
    await db
      .update(callStatuses)
      .set({
        status: response.data.data.callStatus,
        updatedAt: new Date(),
      })
      .where(eq(callStatuses.transactionId, transactionId));

      console.log(`Updated status for transaction ${transactionId} to ${response.data.data.callStatus}`);
      logger.info(`Updated status for transaction ${transactionId} to ${response.data.data.callStatus}`, { label: "status-check" });
  },
  { connection: redisConfig }
);


export const stopStatusCheck = async () => {
  console.log('Shutting down Status Check queue...');

  // 1) stop processing
  if (worker) {
    await worker.pause();
    await worker.close();
  }

  // 2) remove every job (waiting, delayed, active, etc)
  await statusCheckQueue.obliterate({ force: true });

  // 3) close the queue
  await statusCheckQueue.close();

  console.log('Status check queue fully stopped and cleared.');
};