import winston from 'winston';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const numericLogLevels: { [key: string]: number } = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  verbose: 4,
  debug: 5
};

type LogLevel = keyof typeof numericLogLevels | number;

function getLogLevel(level: LogLevel): string {
  if (typeof level === 'string') {
    return level in numericLogLevels ? level : 'info';
  }
  const numLevel = typeof level === 'number' ? level : parseInt(level, 10);
  const stringLevel = Object.keys(numericLogLevels).find(key => numericLogLevels[key] === numLevel);
  return stringLevel || 'info';  // Default to 'info' if no match found
}

const logLevel = getLogLevel(process.env.LOG_LEVEL as LogLevel || 'info');
const logFile = process.env.LOG_FILE || 'logs/package-evaluator.log';

// Ensure the logs directory exists
import fs from 'fs';
const dir = path.dirname(logFile);
if (!fs.existsSync(dir)){
    fs.mkdirSync(dir, { recursive: true });
}

// Create logger
const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'package-evaluator' },
  transports: [
    // Write to all logs with level `info` and below to `package-evaluator.log`
    new winston.transports.File({ filename: logFile }),
    // Write all logs error (and below) to `error.log`
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
  ],
});
export default logger;
