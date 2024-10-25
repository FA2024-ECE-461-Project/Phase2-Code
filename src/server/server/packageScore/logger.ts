import winston from 'winston';
import { existsSync, truncateSync, PathLike, mkdirSync, writeFileSync} from "fs";
import dotenv from 'dotenv';
dotenv.config();

const LOG_LEVELS = {
  SILENT: 0,
  INFO: 1,
  DEBUG: 2,
};

//clear log file

const logFilePath = process.env.LOG_FILE as PathLike;
if(checkLogFilePath() === true) {
  // clear out the log file indicated by LOG_FILE
  truncateSync(logFilePath, 0);
}
else {
  // create logs directory and log files if they don't exist
  const logsDir = 'logs';
  mkdirSync(logsDir, { recursive: true });
  writeFileSync("logs/package-evaluator.log", "", "utf8");
  writeFileSync("logs/error.log", "", "utf8");
}
truncateSync('logs/error.log', 0);

// set log level
// if LOG_LEVEL is not set, default to SILENT
let logLevel = process.env.LOG_LEVEL;
// console.log("LOG_LEVEL: ", logLevel);

switch (logLevel) {
case String(LOG_LEVELS.INFO):
  logLevel = 'info';
  break;
case String(LOG_LEVELS.DEBUG):
  logLevel = 'debug';
  break;
default:
  logLevel = 'silent';
}

// console.log("LOG_LEVEL: string", logLevel);

const logFile = process.env.LOG_FILE || 'logs/package-evaluator.log';
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
    //silent console transport
    new winston.transports.Console({ silent: true }),
    // Write to all logs with level `info` and below to `package-evaluator.log`
    new winston.transports.File({ silent: logLevel === 'silent', filename: logFile , level: 'info' }),
    // Write all error (and below) to `error.log`
    new winston.transports.File({ silent: logLevel === 'silent', filename: 'logs/error.log', level: 'debug' }),
  ],
});

function checkLogFilePath(): boolean {
  return !logFilePath || !existsSync(logFilePath);
}

export default logger;