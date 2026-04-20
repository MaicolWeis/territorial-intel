const { createLogger, format, transports } = require("winston");
const path = require("path");
const fs = require("fs");

const logDir = process.env.DATA_OUTPUT_PATH || "./data/output";
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.printf(({ timestamp, level, message }) => `[${timestamp}] ${level.toUpperCase()}: ${message}`)
  ),
  transports: [
    new transports.Console(),
    new transports.File({
      filename: path.join(logDir, `etl-${new Date().toISOString().split("T")[0]}.log`),
    }),
  ],
});

module.exports = logger;
