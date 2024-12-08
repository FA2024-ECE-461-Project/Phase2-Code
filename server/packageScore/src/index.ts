#!/usr/bin/env ts-node

// index.ts

import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import logger from "./logger";
import { get_bus_factor } from "./metrics/bus-factor";
import { getCorrectnessMetric } from "./metrics/correctness";
import { get_license_compatibility } from "./metrics/license-compatibility";
import { get_ramp_up_time_metric } from "./metrics/ramp-up-time";
import { calculateResponsiveness } from "./metrics/responsiveness";
import { calculatePRCodeReviews } from "./metrics/PRCodeReviews";
import { getDependencyPinningFraction } from "./metrics/dependency"; // Adjust the path accordingly

dotenv.config();

export interface MetricsResult {
  URL: string;
  NetScore: number;
  NetScore_Latency: number;
  RampUp: number;
  RampUp_Latency: number;
  Correctness: number;
  Correctness_Latency: number;
  BusFactor: number;
  BusFactor_Latency: number;
  ResponsiveMaintainer: number;
  ResponsiveMaintainer_Latency: number;
  License: number;
  License_Latency: number;
  PR_Code_Reviews: number;
  PR_Code_Reviews_Latency: number;
  DependencyMetric: number;
  DependencyMetric_Latency: number;
}

export async function processUrl(url: string, extractedDir: string): Promise<MetricsResult> {
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
      getCorrectnessMetric(extractedDir),
      get_bus_factor(extractedDir),
      get_license_compatibility(extractedDir),
      get_ramp_up_time_metric(extractedDir),
      calculateResponsiveness(extractedDir),
      calculatePRCodeReviews(extractedDir),
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
      NetScore_Latency: totalLatency,
      RampUp: rampUpTime.score,
      RampUp_Latency: rampUpTime.latency,
      Correctness: correctnessResult.score,
      Correctness_Latency: correctnessResult.latency,
      BusFactor: busFactorResult.normalizedScore,
      BusFactor_Latency: busFactorResult.latency,
      ResponsiveMaintainer: responsivenessResult.score,
      ResponsiveMaintainer_Latency: responsivenessResult.latency,
      License: licenseCompatibility.score,
      License_Latency: licenseCompatibility.latency,
      PR_Code_Reviews: PRCodeReviewsResult.score,
      PR_Code_Reviews_Latency: PRCodeReviewsResult.latency,
      DependencyMetric: DependencyResult.score,
      DependencyMetric_Latency: DependencyResult.latency,
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
    NetScore_Latency: 0,
    RampUp: 0,
    RampUp_Latency: 0,
    Correctness: 0,
    Correctness_Latency: 0,
    BusFactor: 0,
    BusFactor_Latency: 0,
    ResponsiveMaintainer: 0,
    ResponsiveMaintainer_Latency: 0,
    License: 0,
    License_Latency: 0,
    PR_Code_Reviews: 0,
    PR_Code_Reviews_Latency: 0,
    DependencyMetric: 0,
    DependencyMetric_Latency: 0,
  };
}

export async function processSingleUrl(url: string, extractedDir: string): Promise<MetricsResult> {
  if (!process.env.LOG_FILE) {
    throw new Error("LOG_FILE environment variable is not set");
  }

  if (!process.env.GITHUB_TOKEN) {
    throw new Error("GITHUB_TOKEN environment variable is not set");
  }

  try {
    const result = await processUrl(url, extractedDir);
    const formattedResult: MetricsResult = {
      URL: result.URL,
      NetScore: parseFloat(result.NetScore.toFixed(3)),
      NetScore_Latency: parseFloat((result.NetScore_Latency / 1000).toFixed(3)),
      RampUp: parseFloat(result.RampUp.toFixed(3)),
      RampUp_Latency: parseFloat((result.RampUp_Latency / 1000).toFixed(3)),
      Correctness: parseFloat(result.Correctness.toFixed(3)),
      Correctness_Latency: parseFloat((result.Correctness_Latency / 1000).toFixed(3)),
      BusFactor: parseFloat(result.BusFactor.toFixed(3)),
      BusFactor_Latency: parseFloat((result.BusFactor_Latency / 1000).toFixed(3)),
      ResponsiveMaintainer: parseFloat(result.ResponsiveMaintainer.toFixed(3)),
      ResponsiveMaintainer_Latency: parseFloat((result.ResponsiveMaintainer_Latency / 1000).toFixed(3)),
      License: parseFloat(result.License.toFixed(3)),
      License_Latency: parseFloat((result.License_Latency / 1000).toFixed(3)),
      PR_Code_Reviews: parseFloat(result.PR_Code_Reviews.toFixed(3)),
      PR_Code_Reviews_Latency: parseFloat((result.PR_Code_Reviews_Latency / 1000).toFixed(3)),
      DependencyMetric: parseFloat(result.DependencyMetric.toFixed(3)),
      DependencyMetric_Latency: parseFloat((result.DependencyMetric_Latency / 1000).toFixed(3)),
    };
    return formattedResult;
  } catch (error) {
    logger.error("Error processing URL ${url}:", { error });
    const emptyResult: MetricsResult = createEmptyMetricsResult(url);
    emptyResult.NetScore = -1;
    emptyResult.NetScore_Latency = -1;
    emptyResult.RampUp = -1;
    emptyResult.RampUp_Latency = -1;
    emptyResult.Correctness = -1;
    emptyResult.Correctness_Latency = -1;
    emptyResult.BusFactor = -1;
    emptyResult.BusFactor_Latency = -1;
    emptyResult.ResponsiveMaintainer = -1;
    emptyResult.ResponsiveMaintainer_Latency = -1;
    emptyResult.License = -1;
    emptyResult.License_Latency = -1;
    emptyResult.PR_Code_Reviews = -1;
    emptyResult.PR_Code_Reviews_Latency = -1;
    emptyResult.DependencyMetric = -1;
    emptyResult.DependencyMetric_Latency = -1;
    return emptyResult;
  }
}