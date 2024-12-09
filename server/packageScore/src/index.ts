#!/usr/bin/env ts-node

// index.ts

import fs from "fs";
import path from "path";
import { get_bus_factor } from "./metrics/bus-factor";
import { getCorrectnessMetric } from "./metrics/correctness";
import { get_license_compatibility } from "./metrics/license-compatibility";
import { get_ramp_up_time_metric } from "./metrics/ramp-up-time";
import { calculateResponsiveness } from "./metrics/responsiveness";
import { calculatePRCodeReviews } from "./metrics/PRCodeReviews";
import { getDependencyPinningFraction } from "./metrics/dependency"; // Adjust the path accordingly
import logger from "./logger";
import { promisify } from "util";
import * as dotenv from "dotenv";

dotenv.config();

export interface MetricsResult {
  URL: string;
  NetScore: number;
  NetScoreLatency: number;
  RampUp: number;
  RampUpLatency: number;
  Correctness: number;
  CorrectnessLatency: number;
  BusFactor: number;
  BusFactorLatency: number;
  ResponsiveMaintainer: number;
  ResponsiveMaintainerLatency: number;
  License: number;
  LicenseLatency: number;
  PRCodeReviews: number;
  PRCodeReviewsLatency: number;
  DependencyMetric: number;
  DependencyMetricLatency: number;
}

export async function processUrl(url: string, extractedDir: string, owner: string, repo: string): Promise<MetricsResult> {
  try {
    const startTime = Date.now();

    const [
      correctnessResult,
      busFactorResult,
      licenseCompatibility,
      rampUpTime,
      responsivenessResult,
      PRCodeReviewsResult,
      DependencyResult,
    ] = await Promise.all([
      getCorrectnessMetric(url),
      get_bus_factor(owner, repo),
      get_license_compatibility(extractedDir),
      get_ramp_up_time_metric(extractedDir),
      calculateResponsiveness(extractedDir),
      calculatePRCodeReviews(url),
      getDependencyPinningFraction(extractedDir),
    ]);
    console.log("tset:", extractedDir);
    const endTime = Date.now();
    const totalLatency = endTime - startTime;

    const netScore = calculateNetScore(
      correctnessResult.score,
      busFactorResult.normalizedScore,
      licenseCompatibility.score,
      rampUpTime.score,
      responsivenessResult.score,
      PRCodeReviewsResult.score,
      DependencyResult.score
    );

    logger.info("Metrics calculated", {
      url,
      netScore,
      totalLatency,
      correctness: correctnessResult.score,
      busFactor: busFactorResult.normalizedScore,
      license: licenseCompatibility.score,
      rampUp: rampUpTime.score,
      responsiveness: responsivenessResult.score,
      PRCodeReviewsResult: PRCodeReviewsResult.score,
      Dependency: DependencyResult.score,
    });

    return {
      URL: url,
      NetScore: netScore,
      NetScoreLatency: totalLatency,
      RampUp: rampUpTime.score,
      RampUpLatency: rampUpTime.latency,
      Correctness: correctnessResult.score,
      CorrectnessLatency: correctnessResult.latency,
      BusFactor: busFactorResult.normalizedScore,
      BusFactorLatency: busFactorResult.latency,
      ResponsiveMaintainer: responsivenessResult.score,
      ResponsiveMaintainerLatency: responsivenessResult.latency,
      License: licenseCompatibility.score,
      LicenseLatency: licenseCompatibility.latency,
      PRCodeReviews: PRCodeReviewsResult.score,
      PRCodeReviewsLatency: PRCodeReviewsResult.latency,
      DependencyMetric: DependencyResult.score,
      DependencyMetricLatency: DependencyResult.latency,
    };
  } catch (error) {
    logger.error("Error calculating metrics for ${url}:", { error });
    return createEmptyMetricsResult(url);
  }
}

function calculateNetScore(
  correctness: number,
  busFactor: number,
  license: number,
  rampUp: number,
  responsiveness: number,
  prCodeReviews: number,
  dependency: number
): number {
  const weights = {
    correctness: 0.2,
    busFactor: 0.2,
    responsiveness: 0.2,
    rampUp: 0.2,
    license: 0.1,
    prCodeReviews: 0.05,
    dependency: 0.05,
  };

  return (
    correctness * weights.correctness +
    busFactor * weights.busFactor +
    responsiveness * weights.responsiveness +
    rampUp * weights.rampUp +
    license * weights.license +
    prCodeReviews * weights.prCodeReviews +
    dependency * weights.dependency
  );
}

function createEmptyMetricsResult(url: string): MetricsResult {
  return {
    URL: url,
    NetScore: 0,
    NetScoreLatency: 0,
    RampUp: 0,
    RampUpLatency: 0,
    Correctness: 0,
    CorrectnessLatency: 0,
    BusFactor: 0,
    BusFactorLatency: 0,
    ResponsiveMaintainer: 0,
    ResponsiveMaintainerLatency: 0,
    License: 0,
    LicenseLatency: 0,
    PRCodeReviews: 0,
    PRCodeReviewsLatency: 0,
    DependencyMetric: 0,
    DependencyMetricLatency: 0,
  };
}

// export async function processSingleUrl(url: string, extractedDir: string): Promise<MetricsResult> {
//   if (!process.env.LOG_FILE) {
//     throw new Error("LOG_FILE environment variable is not set");
//   }

//   if (!process.env.GITHUB_TOKEN) {
//     throw new Error("GITHUB_TOKEN environment variable is not set");
//   }

//   try {
//     const result = await processUrl(url, extractedDir, owner, repo);
//     const formattedResult: MetricsResult = {
//       URL: result.URL,
//       NetScore: parseFloat(result.NetScore.toFixed(3)),
//       NetScoreLatency: parseFloat((result.NetScoreLatency / 1000).toFixed(3)),
//       RampUp: parseFloat(result.RampUp.toFixed(3)),
//       RampUpLatency: parseFloat((result.RampUpLatency / 1000).toFixed(3)),
//       Correctness: parseFloat(result.Correctness.toFixed(3)),
//       CorrectnessLatency: parseFloat((result.CorrectnessLatency / 1000).toFixed(3)),
//       BusFactor: parseFloat(result.BusFactor.toFixed(3)),
//       BusFactorLatency: parseFloat((result.BusFactorLatency / 1000).toFixed(3)),
//       ResponsiveMaintainer: parseFloat(result.ResponsiveMaintainer.toFixed(3)),
//       ResponsiveMaintainerLatency: parseFloat((result.ResponsiveMaintainerLatency / 1000).toFixed(3)),
//       License: parseFloat(result.License.toFixed(3)),
//       LicenseLatency: parseFloat((result.LicenseLatency / 1000).toFixed(3)),
//       PRCodeReviews: parseFloat(result.PRCodeReviews.toFixed(3)),
//       PRCodeReviewsLatency: parseFloat((result.PRCodeReviewsLatency / 1000).toFixed(3)),
//       DependencyMetric: parseFloat(result.DependencyMetric.toFixed(3)),
//       DependencyMetricLatency: parseFloat((result.DependencyMetricLatency / 1000).toFixed(3)),
//     };
//     return formattedResult;
//   } catch (error) {
//     logger.error("Error processing URL ${url}:", { error });
//     const emptyResult: MetricsResult = createEmptyMetricsResult(url);
//     emptyResult.NetScore = -1;
//     emptyResult.NetScoreLatency = -1;
//     emptyResult.RampUp = -1;
//     emptyResult.RampUpLatency = -1;
//     emptyResult.Correctness = -1;
//     emptyResult.CorrectnessLatency = -1;
//     emptyResult.BusFactor = -1;
//     emptyResult.BusFactorLatency = -1;
//     emptyResult.ResponsiveMaintainer = -1;
//     emptyResult.ResponsiveMaintainerLatency = -1;
//     emptyResult.License = -1;
//     emptyResult.LicenseLatency = -1;
//     emptyResult.PRCodeReviews = -1;
//     emptyResult.PRCodeReviewsLatency = -1;
//     emptyResult.DependencyMetric = -1;
//     emptyResult.DependencyMetricLatency = -1;
//     return emptyResult;
//   }
// }