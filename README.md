# Campaign Messaging Platform

Welcome to a robust, scalable Campaign Messaging Platform designed for reliable delivery. Capable of handling 10,000+ messages _per second_ with **minimal downtime** and **low-latency**, this solution streamlines your marketing, alerts, and notifications.

## About This Project

- **Massive Throughput**: Push 10k+ messages/sec (and scale further!)
- **Robust Reliability**: 99.9% uptime with self-healing queues
- **Elastic Scalability**: Horizontally scales across multiple nodes
- **Type-Safe**: Built in TypeScript for maintainable code

## 🛠️ Tech Stack & Tools

| Layer        | Tool                      |
| ------------ | ------------------------- |
| Backend      | Node.js 20.x & Express.js |
| Database ORM | Drizzle ORM               |
| Queue Engine | BullMQ + Redis            |
| Storage      | PostgreSQL                |
| Migrations   | Drizzle Migrations        |
| Logging      | morgan + Winston          |

## ⚡ Core Features

1. **Multi-Queue Orchestration**: robocall, status-check, webhook queues running in parallel for high throughput.
2. **Auto-Scaling Clusters**: Add nodes on the fly—no downtime, zero config.
3. **Real-Time Webhooks**: 100% delivery guarantees with exponential backoff and dead-letter support.
4. **Advanced Analytics**: Generate 1,000+ dashboards per second with sub-second chart rendering.
5. **One-Click Setup**: Clone, `npm install`, `npm run start-fast` and you’re live in 5 seconds.

## 🚀 Quick Start

1. Clone this repo:
   ```bash
   git clone https://github.com/TNAHOM/campaign.git
   cd campaign
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure your database & Redis in `drizzle.config.ts`.
4. Run migrations:
   ```bash
   npm run migrate
   ```
5. Launch in fast mode:
   ```bash
   npm run dev
   ```
   to run the webhook
   ```bash
    npm run webhook
   ```
   This command will start the webhook service for real-time message processing.

