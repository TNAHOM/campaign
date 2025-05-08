import { Queue, Worker } from "bullmq";
import { db } from "../db/index.ts";
import { callStatuses, campaignJobs, campaigns, customers } from "../db/schema.ts";
import axios from "axios";
import logger from "../utils/logger.ts";
import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import { config } from "dotenv";
import { statusCheckQueue } from "./statusCheckQueue.ts";
import { webhookQueue } from "./webhookQueue.ts";

config({ path: ".env" });

const redisConfig = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: 6379,
};

export const robocallQueue = new Queue("robocall", {
  connection: redisConfig,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 1000 },
  },
});

export const worker = new Worker(
  "robocall",
  async (job) => {
    console.log(`Processing job ${job.id} with name ${job.name}`);
    const { batch, campaignId, batchIndex, totalBatches } = job.data;

    // Track batch in CampaignJobs
    const jobId = uuidv4();
    await db.insert(campaignJobs).values({
      id: jobId,
      campaignId: campaignId,
      batchNumber: batchIndex + 1,
      status: "processing",
      attempts: job.attemptsMade,
    });

    try {
      const campaign = await db.select()
        .from(campaigns)
        .where(eq(campaigns.id, campaignId))
        .limit(1);

      if (!campaign[0]) {
        throw new Error("Campaign not found");
      }

      // Process each customer in the batch
      for (const customer of batch) {
        const transactionId = uuidv4();
        
        await db.insert(callStatuses).values({
          transactionId,
          customerId: customer.id,
          campaignId,
          status: "initiated",
        });

        // Make robocall request
        const response = await axios.post(
          "http://172.28.17.17:8000/initiatecall",
          {
            ivrNumber: "IVR1",
            mobileNumber: customer.mobileNumber,
            campaignId,
            customerId: customer.id,
            campaignType: "OneTime",
            messageId: "IVR1",
            audioDurationSec: "5",
            transactionId,
            attemptCount: 1,
            lastAttemptDate: new Date().toISOString(),
          }
        );

        logger.info(`Called ${customer.mobileNumber}`, { 
          label: "robocall",
          transactionId,
          status: response.status,
        });

        // Schedule status check
        await statusCheckQueue.add(
          `status-check-${transactionId}`,
          { transactionId },
          { delay: 306_000 } // 5.1 minutes
        );
      }

      await db
        .update(campaignJobs)
        .set({ status: "success" })
        .where(eq(campaignJobs.id, jobId));


        await webhookQueue.add("batch_sent", {
        event: "batch_sent",
        payload: {
          event: "batch_sent",
          campaignId,
          companyId: campaign[0].companyId,
          batchNumber: batchIndex + 1,
          batchSize: batch.length,
          remaining: totalBatches - (batchIndex + 1),
        },
        companyId: campaign[0].companyId,
      });

      // heLps to check if its the last batch 
      if (batchIndex === totalBatches - 1) {
        await webhookQueue.add("campaign_completed", {
          event: "campaign_completed",
          payload: {
            event: "campaign_completed",
            campaignId,
            companyId: campaign[0].companyId,
            totalSubscribers: await db
              .select()
              .from(customers)
              .where(eq(customers.companyId, campaign[0].companyId!))
              .then(res => res.length),
            endDate: new Date().toISOString(),
          },
          companyId: campaign[0].companyId,
        });
      }
    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      logger.error("Batch processing failed", {
        label: "robocall",
        jobId,
        batchNumber: batchIndex + 1,
        error: errorMessage,
      });

      await db
        .update(campaignJobs)
        .set({ 
          status: "failed", 
          attempts: job.attemptsMade,
        })
        .where(eq(campaignJobs.id, jobId));

      throw error;
    }
  },
  { connection: redisConfig }
);

worker.on("failed", (job, error) => {
  logger.error("Job failed", {
    label: "robocall",
    jobId: job?.id,
    name: job?.name,
    error: error.message,
  });
});

export const stopRobocall = async () => {
  console.log('Shutting down Robocall queue...');

  if (worker) {
    await worker.pause();
    await worker.close();
  }

  await robocallQueue.obliterate({ force: true });
  await robocallQueue.close();

  console.log('Robocall queue fully stopped and cleared.');
};