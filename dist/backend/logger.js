"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const winston_1 = __importDefault(require("winston"));
const fs_1 = require("fs");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const LOG_LEVELS = {
    SILENT: 0,
    INFO: 1,
    DEBUG: 2,
};
//clear log file
const logFilePath = process.env.LOG_FILE;
if (checkLogFilePath() === true) {
    // clear out the log file indicated by LOG_FILE
    (0, fs_1.truncateSync)(logFilePath, 0);
}
else {
    // create logs directory and log files if they don't exist
    const logsDir = 'logs';
    (0, fs_1.mkdirSync)(logsDir, { recursive: true });
    (0, fs_1.writeFileSync)("logs/package-evaluator.log", "", "utf8");
    (0, fs_1.writeFileSync)("logs/error.log", "", "utf8");
}
(0, fs_1.truncateSync)('logs/error.log', 0);
// set log level
// if LOG_LEVEL is not set, default to SILENT
let logLevel = process.env.LOG_LEVEL;
console.log("LOG_LEVEL: ", logLevel);
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
console.log("LOG_LEVEL: string", logLevel);
const logFile = process.env.LOG_FILE || 'logs/package-evaluator.log';
// Create logger
const logger = winston_1.default.createLogger({
    level: logLevel,
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.errors({ stack: true }), winston_1.default.format.splat(), winston_1.default.format.json()),
    defaultMeta: { service: 'package-evaluator' },
    transports: [
        //silent console transport
        new winston_1.default.transports.Console({ silent: true }),
        // Write to all logs with level `info` and below to `package-evaluator.log`
        new winston_1.default.transports.File({ silent: logLevel === 'silent', filename: logFile, level: 'info' }),
        // Write all error (and below) to `error.log`
        new winston_1.default.transports.File({ silent: logLevel === 'silent', filename: 'logs/error.log', level: 'debug' }),
    ],
});
function checkLogFilePath() {
    return !logFilePath || !(0, fs_1.existsSync)(logFilePath);
}
exports.default = logger;
