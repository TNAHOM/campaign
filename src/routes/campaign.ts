import express from 'express';
import { campaigns, customers } from '../db/schema.ts';
import { db } from '../db/index.ts';
import { eq } from 'drizzle-orm';
import { robocallQueue } from '../queues/robocallQueue.ts';
import { webhookQueue } from '../queues/webhookQueue.ts';

export const campaignRouter = express.Router();

campaignRouter.post('', async (req: express.Request, res: express.Response) => {
    const { campaignType, companyId, tier } = req.body;

    try {
        const newCampaign = await db.insert(campaigns).values({
            campaignType,
            companyId,
            tier,
        }).returning();

        res.status(201).json(newCampaign);
    } catch (error) {
        console.error('Error creating campaign:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

campaignRouter.post("/start", async (req: express.Request, res: express.Response): Promise<void> => {
    const { campaignId } = req.body;

    try {
        const campaign = await db
            .select()
            .from(campaigns)
            .where(eq(campaigns.id, campaignId))

        if (!campaign[0]) {
            res.status(404).json({ error: "Campaign not found" });
            return;
        }

        const currentCampaign = campaign[0];

        if (currentCampaign.companyId === null) {
            res.status(400).json({ error: "Campaign company ID cannot be null to start." });
            return;
        }

        const targetCustomers = await db
            .select()
            .from(customers)
            .where(
                eq(customers.companyId, currentCampaign.companyId) &&
                eq(customers.tier, currentCampaign.tier))
                .limit(60)

        const batchSize = 20;
        const batches = [];
        for (let i = 0; i < targetCustomers.length; i += batchSize) {
            batches.push(targetCustomers.slice(i, i + batchSize));
        }

        // start the campaign track webhook
        await webhookQueue.add("campaign_start", {
            event: "campaign_start",
            payload: {
              event: "campaign_start",
              campaignId,
              companyId: campaign[0].companyId,
              totalBatches: batches.length,
              startDate: new Date().toISOString(),
            },
            companyId: campaign[0].companyId,
          });


		// In your /campaigns/start endpoint:
        for (const [index, batch] of batches.entries()) {
            await robocallQueue.add(
            `batch-${index}`,
            { 
                batch, 
                campaignId,
                batchIndex: index,
                totalBatches: batches.length
            },
            { delay: index * 120_000 } // 2-minute intervals
            );
        }

        res.json({
            message: `Campaign started with ${batches.length} batches`,
            totalBatches: batches.length,
          });
    } catch (error) {
        console.error('Error starting campaign:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
})