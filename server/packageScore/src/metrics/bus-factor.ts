import { Octokit } from "@octokit/rest";

interface Commit {
  hash: string;
  authorName: string;
  authorEmail: string;
  date: string;
  message: string;
}

interface Contributor {
  name: string;
  email: string;
  commitCount: number;
}

interface BusFactorResult {
  busFactor: number;
  normalizedScore: number;
  latency: number;
}

function calculateBusFactor(
  commits: Commit[],
  contributors: Contributor[],
): Omit<BusFactorResult, "latency"> {


  const commitCounts: { [key: string]: number } = {};

  commits.forEach((commit) => {
    const authorKey = `${commit.authorName} <${commit.authorEmail}>`; // Unique key
    commitCounts[authorKey] = (commitCounts[authorKey] || 0) + 1;
  });

  const totalCommits = commits.length;
  const totalContributors = contributors.length;


  if (totalCommits === 0 || totalContributors === 0) {
    return { busFactor: 1, normalizedScore: 0 };
  }

  const sortedContributions = Object.values(commitCounts).sort((a, b) => b - a);

  let accumulatedCommits = 0;
  let busFactor = 0;

  for (const count of sortedContributions) {
    accumulatedCommits += count;
    busFactor++;
    if (accumulatedCommits > totalCommits * 0.8) break; // Adjust threshold as needed
  }


  const normalizedScore = normalizeScore(
    busFactor,
    totalContributors,
    totalCommits,
  );


  return { busFactor, normalizedScore };
}

function normalizeScore(
  busFactor: number,
  totalContributors: number,
  totalCommits: number,
): number {

  if (totalContributors === 0 || totalCommits < 20) {
    return 0; // Penalize repos with very few commits
  }

  const contributorRatio = busFactor / totalContributors;
  const commitThreshold = Math.min(totalCommits / 100, 1000); // Adjust based on repo size

  let score = contributorRatio * (totalCommits / commitThreshold);


  // Normalize score to be within [0,1]
  score = score / 100; // Adjust scaling as needed

  // Penalize projects with very few contributors
  if (totalContributors < 3) {
    console.info("Applying penalty for low contributor count", {
      totalContributors,
    });
    score *= 0.5;
  }

  const finalScore = Math.max(0, Math.min(1, score));

  return finalScore;
}

export async function get_bus_factor(owner: string, repo: string): Promise<BusFactorResult> {
  const octokit = new Octokit({
    auth: process.env.GITHUB_TOKEN,
  });

  const startTime = Date.now();

  try {
    let commits: Commit[] = [];
    let page = 1;
    const per_page = 100;

    while (true) {
      const response = await octokit.repos.listCommits({
        owner,
        repo,
        per_page,
        page,
      });

      if (response.data.length === 0) break;

      const fetchedCommits: Commit[] = response.data.map(commit => ({
        hash: commit.sha,
        authorName: commit.commit.author?.name || "Unknown",
        authorEmail: commit.commit.author?.email || "unknown@example.com",
        date: commit.commit.author?.date || "",
        message: commit.commit.message,
      }));

      commits = commits.concat(fetchedCommits);
      page++;
    }


    // Extract contributors
    const contributorMap: { [key: string]: Contributor } = {};

    commits.forEach((commit) => {
      const key = `${commit.authorName} <${commit.authorEmail}>`; // Unique key
      if (!contributorMap[key]) {
        contributorMap[key] = {
          name: commit.authorName,
          email: commit.authorEmail,
          commitCount: 1,
        };
      } else {
        contributorMap[key].commitCount += 1;
      }
    });

    const contributors: Contributor[] = Object.values(contributorMap);

    // Calculate Bus Factor
    const busFactorResult = calculateBusFactor(commits, contributors);

    const latency = Date.now() - startTime;

    return { ...busFactorResult, latency };
  } catch (error) {
    return { busFactor: 1, normalizedScore: 0, latency: 0 };
  }
}
