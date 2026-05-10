import "dotenv/config";
import cors from "cors";
import express from "express";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import authRoutes from "./routes/auth.js";
import profileRoutes from "./routes/profiles.js";
import taskRoutes from "./routes/tasks.js";
import sessionRoutes from "./routes/sessions.js";
import paymentRoutes from "./routes/payments.js";
import evidenceRoutes from "./routes/evidence.js";
import adminRoutes from "./routes/admin.js";
import quotesDeliveriesRoutes from "./routes/quotes-deliveries.js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(cors());
app.use(express.json());
app.use("/operator", express.static(join(__dirname, "../admin-ui")));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/auth", authRoutes);
app.use("/profiles", profileRoutes);
app.use("/tasks", taskRoutes);
app.use("/sessions", sessionRoutes);
app.use("/payments", paymentRoutes);
app.use("/evidence", evidenceRoutes);
app.use("/admin", adminRoutes);
app.use("/", quotesDeliveriesRoutes);

const port = Number(process.env.PORT ?? 3000);
app.listen(port, () => {
  console.log(`freedom-server listening on :${port}`);
});
