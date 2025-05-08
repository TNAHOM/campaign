import winston from "winston";
import morgan from "morgan";

// Configure Winston
const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(
      ({ timestamp, level, message }) => `${timestamp} [${level}]: ${message}`
    ),
    winston.format.colorize({ all: true })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/webhook.log", level: "info" }),
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
  ],
});

// Configure Morgan middleware
export const morganMiddleware = morgan(
  ":method :url :status :res[content-length] - :response-time ms",
  { stream: { write: (message) => logger.info(message.trim()) } }
);

export default logger;