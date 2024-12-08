#!/usr/bin/env ts-node

import { Command } from "commander";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import {
  classifyURL,
  UrlType,
  extractNpmPackageName,
  getNpmPackageGitHubUrl,
  parseGitHubUrl,
  get_axios_params,
  getToken,
} from "./url";
import { get_bus_factor, BusFactorResult } from "./metrics/bus-factor";
import { getCorrectnessMetric, CorrectnessResult } from "./metrics/correctness";
import { get_license_compatibility, LicenseResult } from "./metrics/license-compatibility";
import { get_ramp_up_time_metric, RampUpResult } from "./metrics/ramp-up-time";
import { calculateResponsiveness, ResponsivenessResult } from "./metrics/responsiveness";
import { calculatePRCodeReviews, PRCodeReviewsResult } from "./metrics/PRCodeReviews";
import { getDependencyPinningFraction, DependencyResult } from "./metrics/dependency";
import logger from "./logger";
import * as dotenv from "dotenv";

dotenv.config();

/**
 * Interface representing the aggregated Metrics result.
 */
export interface MetricsResult {
  URL: string;
  NetScore: number;
  NetScore_Latency: number;
  RampUp: number;
  RampUp_Latency: number;
  Correctness: number;
  Correctness_Latency: number;
  BusFactor: number;
  BusFactorLatency: number;
  ResponsiveMaintainer: number;
  ResponsiveMaintainer_Latency: number;
  PR_Code_Reviews: number;
  PR_Code_Reviews_Latency: number;
  License: number;
  License_Latency: number;
  DependencyMetric: number;
  DependencyMetric_Latency: number;
}

/**
 * Clones a GitHub repository using the native Git CLI.
 * @param githubUrl - The HTTPS URL of the GitHub repository to clone.
 * @param targetDir - The local directory path where the repository will be cloned.
 */
export async function cloneRepo(githubUrl: string, targetDir: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Ensure the target directory exists
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      logger.debug(`Created target directory: ${targetDir}`);
    }

    logger.info(`Cloning repository: ${githubUrl} into ${targetDir}`);

    // Spawn the git clone process
    const gitProcess = spawn('git', ['clone', githubUrl, targetDir], {
      stdio: 'inherit', // Inherit stdio for real-time logging
      shell: true,      // Use shell to ensure Git is found in PATH
    });

    gitProcess.on('error', (error) => {
      logger.error(`Failed to start git clone process: ${error.message}`);
      reject(error);
    });

    gitProcess.on('close', (code) => {
      if (code === 0) {
        logger.info(`Successfully cloned repository: ${githubUrl}`);
        resolve();
      } else {
        const error = new Error(`git clone exited with code ${code}`);
        logger.error(`git clone failed: ${error.message}`);
        reject(error);
      }
    });
  });
}

/**
 * Removes a cloned repository directory.
 * @param repoPath - The local directory path of the cloned repository to remove.
 */
export async function removeRepo(repoPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    logger.info(`Removing repository at: ${repoPath}`);

    fs.rm(repoPath, { recursive: true, force: true }, (err) => {
      if (err) {
        logger.error(`Error removing repository: ${err.message}`);
        reject(err);
      } else {
        logger.info(`Successfully removed repository: ${repoPath}`);
        resolve();
      }
    });
  });
}

/**
 * Creates an empty MetricsResult with default values.
 * @param url The URL that failed to process.
 * @returns An empty MetricsResult object.
 */
function createEmptyMetricsResult(url: string): MetricsResult {
  return {
    URL: url,
    NetScore: 0,
    NetScore_Latency: 0,
    RampUp: 0,
    RampUp_Latency: 0,
    Correctness: 0,
    Correctness_Latency: 0,
    BusFactor: 0,
    BusFactorLatency: 0,
    ResponsiveMaintainer: 0,
    ResponsiveMaintainer_Latency: 0,
    PR_Code_Reviews: 0,
    PR_Code_Reviews_Latency: 0,
    License: 0,
    License_Latency: 0,
    DependencyMetric: 0,
    DependencyMetric_Latency: 0,
  };
}

/**
 * Calculates the Net Score based on individual metric scores and their weights.
 * @param correctness Correctness score.
 * @param busFactor Bus Factor score.
 * @param rampUp Ramp-Up Time score.
 * @param responsiveness Responsiveness score.
 * @param prCodeReviews PR Code Reviews score.
 * @param license License Compatibility score.
 * @param dependency Dependency Pinning score.
 * @returns The aggregated Net Score.
 */
function calculateNetScore(
  correctness: number,
  busFactor: number,
  rampUp: number,
  responsiveness: number,
  prCodeReviews: number,
  license: number,
  dependency: number,
): number {
  const weights = {
    correctness: 0.15,
    busFactor: 0.15,
    rampUp: 0.15,
    responsiveness: 0.15,
    prCodeReviews: 0.10,
    license: 0.15,
    dependency: 0.15,
  };

  const netScore =
    correctness * weights.correctness +
    busFactor * weights.busFactor +
    rampUp * weights.rampUp +
    responsiveness * weights.responsiveness +
    prCodeReviews * weights.prCodeReviews +
    license * weights.license +
    dependency * weights.dependency;

  logger.debug(`Net Score Calculation: ${netScore}`);

  return netScore;
}

/**
 * Aggregates and calculates all metrics for a given GitHub repository.
 * @param url GitHub repository URL.
 * @param cloneDir The local directory path of the cloned repository.
 * @returns The aggregated MetricsResult.
 */
async function getMetrics(
  url: string,
  cloneDir: string,
): Promise<MetricsResult> {
  try {
    const startTime = Date.now();

    const [
      correctnessResult,
      busFactorResult,
      rampUpTime,
      responsivenessResult,
      PRCodeReviewsResult,
      licenseCompatibility,
      dependencyResult,
    ] = await Promise.all([
      getCorrectnessMetric(url),
      get_bus_factor(url),
      get_ramp_up_time_metric(url),
      calculateResponsiveness(url),
      calculatePRCodeReviews(url),
      get_license_compatibility(cloneDir),
      getDependencyPinningFraction(url),
    ]);

    const endTime = Date.now();
    const totalLatency = endTime - startTime;

    const netScore = calculateNetScore(
      correctnessResult.score,
      busFactorResult.score,
      rampUpTime.score,
      responsivenessResult.score,
      PRCodeReviewsResult.score,
      licenseCompatibility.score,
      dependencyResult.score,
    );

    logger.info("Metrics calculated", {
      url,
      netScore,
      totalLatency,
      correctness: correctnessResult.score,
      busFactor: busFactorResult.score,
      rampUp: rampUpTime.score,
      responsiveness: responsivenessResult.score,
      PRCodeReviews: PRCodeReviewsResult.score,
      license: licenseCompatibility.score,
      dependency: dependencyResult.score,
    });

    return {
      URL: url,
      NetScore: parseFloat(netScore.toFixed(3)),
      NetScore_Latency: parseFloat((totalLatency / 1000).toFixed(3)),
      RampUp: parseFloat(rampUpTime.score.toFixed(3)),
      RampUp_Latency: parseFloat((rampUpTime.latency / 1000).toFixed(3)),
      Correctness: parseFloat(correctnessResult.score.toFixed(3)),
      Correctness_Latency: parseFloat((correctnessResult.latency / 1000).toFixed(3)),
      BusFactor: parseFloat(busFactorResult.score.toFixed(3)),
      BusFactorLatency: parseFloat((busFactorResult.latency / 1000).toFixed(3)),
      ResponsiveMaintainer: parseFloat(responsivenessResult.score.toFixed(3)),
      ResponsiveMaintainer_Latency: parseFloat((responsivenessResult.latency / 1000).toFixed(3)),
      PR_Code_Reviews: parseFloat(PRCodeReviewsResult.score.toFixed(3)),
      PR_Code_Reviews_Latency: parseFloat((PRCodeReviewsResult.latency / 1000).toFixed(3)),
      License: parseFloat(licenseCompatibility.score.toFixed(3)),
      License_Latency: parseFloat((licenseCompatibility.latency / 1000).toFixed(3)),
      DependencyMetric: parseFloat(dependencyResult.score.toFixed(3)),
      DependencyMetric_Latency: parseFloat((dependencyResult.latency / 1000).toFixed(3)),
    };
  } catch (error) {
    logger.error(`Error calculating metrics for ${url}: ${error}`);
    return createEmptyMetricsResult(url);
  }
}

/**
 * Processes a single URL and returns the calculated metrics.
 * @param url The URL to process.
 * @returns The calculated MetricsResult.
 */
export async function processSingleUrl(url: string): Promise<MetricsResult> {
  if (!process.env.LOG_FILE) {
    throw new Error("LOG_FILE environment variable is not set");
  }

  if (!process.env.GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN environment variable is not set");
  }

  try {
    const urlType = classifyURL(url);
    let githubUrl = "";

    switch (urlType) {
      case UrlType.GitHub:
        githubUrl = url;
        break;
      case UrlType.NPM:
        const packageName = extractNpmPackageName(url);
        if (packageName) {
          const extractedGithubUrl = await getNpmPackageGitHubUrl(packageName);
          if (extractedGithubUrl) {
            githubUrl = extractedGithubUrl;
            logger.info(`NPM package ${url} converted to GitHub URL: ${githubUrl}`);
          } else {
            logger.error(`Unable to extract GitHub URL for NPM package: ${url}`);
            return createEmptyMetricsResult(url);
          }
        } else {
          logger.error(`Invalid NPM package URL: ${url}`);
          return createEmptyMetricsResult(url);
        }
        break;
      case UrlType.Other:
        logger.error(`Unsupported URL type: ${url}`);
        return createEmptyMetricsResult(url);
    }

    const { owner, repo } = parseGitHubUrl(githubUrl);
    const cloneDir = path.join(process.cwd(), "cloned_repos", `${owner}_${repo}`);

    if (fs.existsSync(cloneDir)) {
      logger.warn(`Clone directory already exists. Removing it: ${cloneDir}`);
      await removeRepo(cloneDir);
    }

    logger.info(`Cloning repository: ${githubUrl} to ${cloneDir}`);
    await cloneRepo(githubUrl, cloneDir);

    const metrics: MetricsResult = await getMetrics(githubUrl, cloneDir);

    // Remove the cloned repository after processing
    await removeRepo(cloneDir);

    return metrics;
  } catch (error: any) {
    logger.error(`Error processing URL ${url}: ${error.message}`);
    return createEmptyMetricsResult(url);
  }
}

/**
 * Sets up and runs the CLI application.
 */
async function main() {
  const program = new Command();

  program
    .version('1.0.0')
    .description('ACME Module Trustworthiness CLI');

  program
    .argument('<file>', 'Process URLs from a file')
    .action(async (file: string) => {
      if (!process.env.LOG_FILE) {
        console.error('LOG_FILE environment variable is not set');
        process.exit(1);
      }

      if (!process.env.GITHUB_TOKEN) {
        console.error('GITHUB_TOKEN environment variable is not set');
        process.exit(1);
      }

      try {
        const absolutePath = path.resolve(file);
        if (!fs.existsSync(absolutePath)) {
          logger.error(`File not found: ${absolutePath}`);
          console.error(`File not found: ${absolutePath}`);
          process.exit(1);
        }

        const fileContent = fs.readFileSync(absolutePath, 'utf-8');
        const urls = fileContent.split('\n').map(line => line.trim()).filter(url => url !== '');

        for (const url of urls) {
          try {
            const result = await processSingleUrl(url);
            console.log(JSON.stringify(result));
          } catch (error: any) {
            logger.error(`Error processing URL ${url}: ${error.message}`);
            const emptyResult = createEmptyMetricsResult(url);
            console.log(JSON.stringify(emptyResult));
          }
        }

        process.exit(0);
      } catch (error: any) {
        logger.error(`Error processing URL file: ${error.message}`);
        console.error(`Error processing URL file: ${error.message}`);
        process.exit(1);
      }
    });

  program.parse(process.argv);
}

