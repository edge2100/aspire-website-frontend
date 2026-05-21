const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const { config } = require("./config");
const { normalizeLeadPayload, validateLeadPayload } = require("./validation");
const { createTransporter, sendLeadEmail } = require("./mailer");
const { incrementSubmissionCount } = require("./statsStore");

const app = express();
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      const allowed = [
        /^https?:\/\/localhost:\d+$/,
        /^https?:\/\/(.*\.)?aspirenow\.in$/,
      ];
      if (!origin || allowed.some((r) => r.test(origin))) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "OPTIONS"],
  })
);
app.use(express.json({ limit: "100kb" }));

app.use(
  "/api/leads",
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

const hasMailConfig =
  config.smtp.host &&
  config.smtp.user &&
  config.smtp.pass &&
  config.email.from &&
  config.email.to.length > 0;

const transporter = hasMailConfig ? createTransporter(config.smtp) : null;

const forwardLead = async (lead) => {
  if (!config.forwardEndpoints.length) return [];

  const tasks = config.forwardEndpoints.map((endpoint) =>
    fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
    })
  );

  return Promise.allSettled(tasks);
};

app.post("/api/leads", async (req, res) => {
  const lead = normalizeLeadPayload(req.body);
  const errors = validateLeadPayload(lead);
  if (errors.length > 0) {
    return res.status(400).json({ ok: false, errors });
  }

  if (!transporter) {
    return res.status(500).json({
      ok: false,
      error: "Email transport is not configured on server.",
    });
  }

  try {
    const submissionNumber = await incrementSubmissionCount(config.statsFile);

    await sendLeadEmail({
      transporter,
      from: config.email.from,
      to: config.email.to.join(", "),
      lead,
      submissionNumber,
    });

    await forwardLead(lead);
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Lead submit failed:", error);
    return res.status(500).json({
      ok: false,
      error: "Unable to process lead. Please try again.",
    });
  }
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.listen(config.port, () => {
  console.log(`Lead API running on http://localhost:${config.port}`);
});
