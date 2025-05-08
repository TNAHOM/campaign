import { db } from "../db/index.ts";
import { companies, customers, campaigns } from "../db/schema.ts";
import { eq } from "drizzle-orm";

const insertCompanies = async () => {
  const mockCompanies = [
    { name: "Ride", webhook_url: "http://localhost:3005/webhooks" },
    { name: "Gebeta maps", webhook_url: "http://localhost:3005/webhooks" },
    { name: "chapa", webhook_url: "http://localhost:3005/webhooks" },
    { name: "beu", webhook_url: "http://localhost:3005/webhooks" },
  ];

  await db.insert(companies).values(mockCompanies);
  console.log("Inserted 4 companies");
};

const insertCustomers = async () => {
  const allCompanies = await db.select().from(companies);
  const customerBatch = [];

  for (const company of allCompanies) {
    for (let i = 0; i < 2500; i++) {
      customerBatch.push({
        mobileNumber: `0913${Math.floor(1000000 + Math.random() * 9000000)}`,
        tier: Math.floor(Math.random() * 4) + 1,
        companyId: company.id,
      });
    }
  }

  // hElps to aoid timeout or erors
  for (let i = 0; i < customerBatch.length; i += 500) {
    await db.insert(customers).values(customerBatch.slice(i, i + 500));
    console.log(`Inserted ${Math.min(i + 500, customerBatch.length)} customers`);
  }
};

const insertCampaigns = async () => {
  const companyA = await db.select().from(companies).where(eq(companies.name, "Ride")).limit(1);
  
  await db.insert(campaigns).values([
    {
      campaignType: "OneTime",
      companyId: companyA[0].id,
      tier: 1, // Target Tier 1 customers
    },
    {
      campaignType: "Recurring",
      companyId: companyA[0].id,
      tier: 2, // Target Tier 2 customers
    },
  ]);
  console.log("Inserted 2 campaigns");
};

// Run the script
const populate = async () => {
//   await insertCompanies();
//   await insertCustomers();
//   await insertCampaigns();
  process.exit(0);
};

populate().catch((err) => {
  console.error("Error populating data:", err);
  process.exit(1);
});