/* this is a script that parses eslint-report.json and outputs a lint-score to the console */
import fs from 'fs';
import path from 'path';


if (!fs.existsSync(path.join(__dirname, "eslint-report.json"))) {
    console.log("eslint-report.json not found");
    process.exit(1);
}

//interface needed to parse json: self define one to interact with the json file
interface EslintReportObject {
    errorCount: number;
    warningCount: number;
}


// file parsing logic
const eslintReport = JSON.parse(fs.readFileSync(path.join(__dirname, "eslint-report.json"), "utf8"));

const totalErrors = eslintReport.reduce((acc: number, curr: EslintReportObject) => acc + curr.errorCount, 0);   
const totalWarnings = eslintReport.reduce((acc: number, curr: EslintReportObject) => acc + curr.warningCount, 0);
const totalFiles = eslintReport.length;
const lintScore = (totalErrors * 0.6 + totalWarnings * 0.4) / (totalFiles);

console.log(`Lint Score: ${lintScore.toPrecision(3)}/10, Total Errors: ${totalErrors}, Total Warnings: ${totalWarnings}, Total Files: ${totalFiles}`);



