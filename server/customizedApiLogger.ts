import * as fs from "fs";

export function writeLogToFile(logFilePath: string, message: string,  ...rest: string[]) {
  // Concatenate the message and rest arguments into a single string
  const logEntry = [message, ...rest].join(' ') + '\n';

  // Append the concatenated log entry to the file
  fs.appendFile(logFilePath, logEntry, (err: any) => {
    if (err) {
      console.error('Error appending to log file:', err);
    }
  });
}