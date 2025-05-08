import { Queue, Worker } from "bullmq";
import axios from "axios";
import { db } from "../db/index.ts";
import { companies } from "../db/schema.ts";
import { eq } from "drizzle-orm";
import logger from "../utils/logger.ts";

const redisConfig = { host: "localhost", port: 6379 };

export const webhookQueue = new Queue("webhooks", {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
  },
});

// Worker to send webhooks
const worker = new Worker(
  "webhooks",
  async (job) => {
    const { event, payload, companyId } = job.data;
    
    // Fetch company's webhook URL
    const company = await db
      .select({ webhookUrl: companies.webhook_url })
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    console.log(company[0]?.webhookUrl);

    if (!company[0]?.webhookUrl) {
      logger.error(`No webhook URL found for company ${companyId}`);
      throw new Error("Webhook URL missing");
    }

    try {
      await axios.post(company[0].webhookUrl, payload);
      logger.info(`Webhook sent: ${event}`, { label: "webhook" });
    } catch (error) {
      logger.error(`Webhook failed: ${event}`, { label: "webhook" });
      
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Webhook failed: ${message}`);
    }
  },
  { connection: redisConfig }
);

export const stopWebhook = async () => {
  console.log('Shutting down Robocall queue...');

  if (worker) {
    await worker.pause();
    await worker.close();
  }

  await webhookQueue.obliterate({ force: true });

  await webhookQueue.close();

  console.log('Webhook queue fully stopped and cleared.');
};