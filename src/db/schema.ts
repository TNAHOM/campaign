import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  webhook_url: text("webhook_url"),
});

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  mobileNumber: text("mobile_number").notNull(),
  tier: integer("tier").notNull(),
  companyId: uuid("company_id").references(() => companies.id),
});

export const campaigns = pgTable("campaigns", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignType: text("campaign_type").notNull(),
  companyId: uuid("company_id").references(() => companies.id),
  tier: integer("tier").notNull(),
});

export const campaignJobs = pgTable("campaign_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  campaignId: uuid("campaign_id").references(() => campaigns.id),
  status: text("status").default("pending"),
  batchNumber: integer("batch_number").notNull(),
  attempts: integer("attempts").default(0),
  createdAt: timestamp("created_at").defaultNow(),
});

export const callStatuses = pgTable("call_statuses", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id").notNull().unique(),
  customerId: uuid("customer_id").references(() => customers.id),
  campaignId: uuid("campaign_id").references(() => campaigns.id),
  status: text("status").default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
});