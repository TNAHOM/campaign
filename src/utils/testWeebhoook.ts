import express from "express";
const app = express();
app.use(express.json());

app.post("/webhooks", (req, res) => {
  console.log("Received webhook:", JSON.stringify(req.body, null, 2));
  res.sendStatus(200);
});

app.listen(3005, () => {
  console.log("Mock webhook server: http://localhost:3005/webhooks");
  console.log("Listening for incoming webhooks...");
});