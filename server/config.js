const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const toList = (value) =>
  (value || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);

const config = {
  port: Number(process.env.SERVER_PORT || 2575),
  smtp: {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  email: {
    from: process.env.LEADS_EMAIL_FROM || process.env.SMTP_USER,
    to: toList(process.env.LEADS_EMAIL_TO),
  },
  statsFile: path.resolve(process.cwd(), "data", "lead-stats.json"),
  forwardEndpoints: toList(process.env.LEADS_FORWARD_ENDPOINTS),
};

module.exports = { config };
