import { Octokit } from '@octokit/rest';
import { DateTime } from 'luxon';
import { PullRequest } from '../../domain/entities/pull-request';

/**
 * A thin wrapper around Octokit that adds absolutely nothing of value
 * except the illusion of abstraction.
 */
export class GitHubClient {
  private client: Octokit;

  constructor(token: string) {
    this.client = new Octokit({ auth: token });
  }

  /**
   * Find PRs that haven't been touched in X days.
   * Shockingly, there are usually many of these.
   */
  async findInactivePRs(
    repos: string[],
    inactivityThresholdDays: number
  ): Promise<PullRequest[]> {
    const allPRs: PullRequest[] = [];

    // If no specific repos, get all for authenticated user
    if (!repos.length) {
      const { data: userRepos } = await this.client.repos.listForAuthenticatedUser({
        visibility: 'all',
        sort: 'updated',
        per_page: 100,
      });
      
      repos = userRepos.map(repo => repo.full_name);
      console.log(`No specific repositories configured. Found ${repos.length} repos to check.`);
    }

    const thresholdDate = DateTime.now().minus({ days: inactivityThresholdDays }).toISO();

    // For each repo, get open PRs
    for (const repo of repos) {
      try {
        const [owner, repoName] = repo.split('/');
        
        console.log(`Checking repository ${repo} for abandoned PRs...`);
        
        const { data: pullRequests } = await this.client.pulls.list({
          owner,
          repo: repoName,
          state: 'open',
          sort: 'updated',
          direction: 'asc',
          per_page: 100,
        });

        // Filter PRs by inactivity threshold
        for (const pr of pullRequests) {
          const updatedAt = DateTime.fromISO(pr.updated_at);
          const now = DateTime.now();
          const inactivityDays = Math.floor(now.diff(updatedAt, 'days').days);
          
          if (inactivityDays >= inactivityThresholdDays) {
            allPRs.push({
              id: pr.id,
              number: pr.number,
              repositoryFullName: repo,
              title: pr.title,
              url: pr.html_url,
              createdAt: pr.created_at,
              updatedAt: pr.updated_at,
              inactivityDays,
              authorLogin: pr.user?.login || 'unknown',
              labels: pr.labels.map(label => 
                typeof label === 'string' ? label : label.name || ''
              ).filter(Boolean)
            });
          }
        }
      } catch (error) {
        console.error(`Error fetching PRs for ${repo}:`, error);
      }
    }

    return allPRs;
  }

  /**
   * Get a specific PR because we don't trust our cached data.
   * GitHub API calls are cheap, right?
   */
  async getPullRequest(
    repositoryFullName: string,
    prNumber: number
  ): Promise<PullRequest> {
    const [owner, repo] = repositoryFullName.split('/');
    
    try {
      const { data: pr } = await this.client.pulls.get({
        owner,
        repo,
        pull_number: prNumber,
      });
      
      const updatedAt = DateTime.fromISO(pr.updated_at);
      const now = DateTime.now();
      const inactivityDays = Math.floor(now.diff(updatedAt, 'days').days);
      
      return {
        id: pr.id,
        number: pr.number,
        repositoryFullName,
        title: pr.title,
        url: pr.html_url,
        createdAt: pr.created_at,
        updatedAt: pr.updated_at,
        inactivityDays,
        authorLogin: pr.user?.login || 'unknown',
        labels: pr.labels.map(label => 
          typeof label === 'string' ? label : label.name || ''
        ).filter(Boolean)
      };
    } catch (error) {
      console.error(`Error fetching PR ${repositoryFullName}#${prNumber}:`, error);
      throw error;
    }
  }

  /**
   * Post a comment that will be ignored just like all the others.
   */
  async postComment(
    repositoryFullName: string,
    prNumber: number,
    message: string
  ): Promise<void> {
    const [owner, repo] = repositoryFullName.split('/');
    
    try {
      await this.client.issues.createComment({
        owner,
        repo,
        issue_number: prNumber,
        body: message,
      });
    } catch (error) {
      console.error(`Error posting comment on ${repositoryFullName}#${prNumber}:`, error);
      throw error;
    }
  }

  /**
   * Close the PR with the emotional detachment of a robot.
   * No one will miss it.
   */
  async closePR(
    repositoryFullName: string,
    prNumber: number
  ): Promise<void> {
    const [owner, repo] = repositoryFullName.split('/');
    
    try {
      await this.client.pulls.update({
        owner,
        repo,
        pull_number: prNumber,
        state: 'closed',
      });
    } catch (error) {
      console.error(`Error closing PR ${repositoryFullName}#${prNumber}:`, error);
      throw error;
    }
  }
}

export interface GitHubClient {
  findInactivePRs(repositories: string[], daysThreshold: number): Promise<PullRequest[]>;
  getPullRequest(repositoryFullName: string, prNumber: number): Promise<PullRequest>;
  postComment(repositoryFullName: string, prNumber: number, message: string): Promise<void>;
  closePR(repositoryFullName: string, prNumber: number): Promise<void>;
}