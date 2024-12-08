import * as fs from "fs";

export function writeLogToFile(message: string, log: string) {
  fs.appendFile(message, log, (err: any) => {
    if (err) {
      console.error(err);
    }
  });
}
