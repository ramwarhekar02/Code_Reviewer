const winston = require("winston");

const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4
};

const level = process.env.NODE_ENV === "production" ? "info" : "debug";

const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  process.env.NODE_ENV === "production"
    ? winston.format.json()
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? " " + JSON.stringify(meta) : "";
          return `${timestamp} ${level}: ${message}${metaStr}`;
        })
      )
);

const logger = winston.createLogger({
  levels,
  level,
  format,
  transports: [new winston.transports.Console()]
});

logger.stream = {
  write(message) {
    logger.http(message.trim());
  }
};

module.exports = logger;
