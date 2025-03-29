import { DateTime } from 'luxon';
import { PullRequest, PullRequestRecord, PullRequestStatus } from '../entities/pull-request';
import { GitHubClient } from '../../infrastructure/github/github-client';
import { PullRequestRepository } from '../../infrastructure/persistence/dynamo-repository';
import { ConfigService } from '../../config/config';

/**
 * Service responsible for identifying and terminating PRs, much like
 * a corporate restructuring consultant but with more transparency.
 */
export class ReaperService {
  constructor(
    private readonly gitHubClient: GitHubClient,
    private readonly prRepository: PullRequestRepository,
    private readonly config: ConfigService
  ) {}

  /**
   * Find PRs that have been abandoned and post warnings.
   * Like putting Post-It notes on expired food in the office fridge.
   */
  async findAndWarnAbandonedPRs(): Promise<void> {
    const abandonedPRs = await this.gitHubClient.findInactivePRs(
      this.config.getRepositories(),
      this.config.getWarningThresholdDays()
    );
    
    console.log(`Found ${abandonedPRs.length} abandoned PRs. Humanity's attention span strikes again.`);
    
    for (const pr of abandonedPRs) {
      // Skip PRs with immunity labels, for those special projects that will definitely be finished someday
      if (this.hasImmunityLabel(pr)) {
        await this.markPrAsImmune(pr);
        continue;
      }

      // Check if we've already warned this PR
      const record = await this.prRepository.findByRepoAndPrNumber(
        pr.repositoryFullName, 
        pr.number
      );
      
      if (!record || record.status === PullRequestStatus.ACTIVE) {
        await this.warnPR(pr);
      }
    }
  }

  /**
   * Execute PRs that didn't respond to warnings.
   * The digital equivalent of clearing out the fridge regardless of protests.
   */
  async findAndExecuteWarned(): Promise<void> {
    const warnedRecords = await this.prRepository.findByStatus(PullRequestStatus.WARNED);
    
    console.log(`Found ${warnedRecords.length} previously warned PRs to review. The day of reckoning approaches.`);
    
    for (const record of warnedRecords) {
      // Fetch current PR data to make sure it's still stale
      const pr = await this.gitHubClient.getPullRequest(
        record.repositoryFullName,
        record.prNumber
      );
      
      // Check if it's somehow become active since warning
      if (this.isPRActive(pr, record)) {
        await this.prRepository.update({
          ...record,
          status: PullRequestStatus.ACTIVE,
          lastCheckedAt: DateTime.now().toISO()
        });
        continue;
      }
      
      // Check if it's gained immunity somehow
      if (this.hasImmunityLabel(pr)) {
        await this.markPrAsImmune(pr);
        continue;
      }
      
      // Check if warning period has elapsed
      const warningDate = DateTime.fromISO(record.warningPostedAt!);
      const daysSinceWarning = Math.floor(
        DateTime.now().diff(warningDate, 'days').days
      );
      
      if (daysSinceWarning >= this.config.getExecutionThresholdDays()) {
        await this.executePR(pr, record);
      }
    }
  }

  /**
   * Decides if a PR should be spared based on magical labels.
   * The digital equivalent of "but I was going to eat that!"
   */
  private hasImmunityLabel(pr: PullRequest): boolean {
    const immunityLabels = this.config.getImmunityLabels();
    return pr.labels.some((label: string) => immunityLabels.includes(label));
  }

  /**
   * Posts a passive-aggressive warning on the PR.
   * The digital equivalent of a sticky note saying "I'll throw this out on Friday"
   */
  private async warnPR(pr: PullRequest): Promise<void> {
    const warningMessage = this.config.getWarningMessage()
      .replace('{{days}}', pr.inactivityDays.toString());
    
    await this.gitHubClient.postComment(
      pr.repositoryFullName, 
      pr.number, 
      warningMessage
    );
    
    const now = DateTime.now().toISO();
    
    await this.prRepository.create({
      id: `${pr.repositoryFullName}#${pr.number}`,
      repositoryFullName: pr.repositoryFullName,
      prNumber: pr.number,
      status: PullRequestStatus.WARNED,
      warningPostedAt: now,
      lastCheckedAt: now
    });
    
    console.log(`Posted warning on ${pr.repositoryFullName}#${pr.number} - "${pr.title}"`);
  }

  /**
   * Closes the PR with extreme prejudice.
   * The digital equivalent of taking out the trash while making eye contact.
   */
  private async executePR(pr: PullRequest, record: PullRequestRecord): Promise<void> {
    const closingMessage = this.config.getClosingMessage()
      .replace('{{days}}', pr.inactivityDays.toString());
    
    await this.gitHubClient.postComment(
      pr.repositoryFullName, 
      pr.number, 
      closingMessage
    );
    
    await this.gitHubClient.closePR(pr.repositoryFullName, pr.number);
    
    const now = DateTime.now().toISO();
    
    await this.prRepository.update({
      ...record,
      status: PullRequestStatus.EXECUTED,
      executedAt: now,
      lastCheckedAt: now
    });
    
    console.log(`Executed ${pr.repositoryFullName}#${pr.number} - "${pr.title}". Another one bites the dust.`);
  }

  /**
   * Marks a PR as having immunity from the reaper.
   * For those special snowflake PRs that get a pass.
   */
  private async markPrAsImmune(pr: PullRequest): Promise<void> {
    const record = await this.prRepository.findByRepoAndPrNumber(
      pr.repositoryFullName, 
      pr.number
    );
    
    if (record && record.status !== PullRequestStatus.IMMUNE) {
      // Post a snarky comment about the reprieve
      const reprieveMessage = this.config.getReprieveMessage();
      
      await this.gitHubClient.postComment(
        pr.repositoryFullName, 
        pr.number, 
        reprieveMessage
      );
      
      await this.prRepository.update({
        ...record,
        status: PullRequestStatus.IMMUNE,
        lastCheckedAt: DateTime.now().toISO()
      });
      
      console.log(`PR ${pr.repositoryFullName}#${pr.number} has been granted immunity. For now.`);
    } else if (!record) {
      // Create a new record with immune status
      await this.prRepository.create({
        id: `${pr.repositoryFullName}#${pr.number}`,
        repositoryFullName: pr.repositoryFullName,
        prNumber: pr.number,
        status: PullRequestStatus.IMMUNE,
        lastCheckedAt: DateTime.now().toISO()
      });
      
      console.log(`PR ${pr.repositoryFullName}#${pr.number} registered with immunity status.`);
    }
  }

  /**
   * Determines if a PR is actually active again.
   * For those rare occasions when people actually do their jobs.
   */
  private isPRActive(pr: PullRequest, record: PullRequestRecord): boolean {
    // If there was activity since we warned it
    if (record.warningPostedAt) {
      const warningDate = DateTime.fromISO(record.warningPostedAt);
      const updatedDate = DateTime.fromISO(pr.updatedAt);
      
      return updatedDate > warningDate;
    }
    
    return false;
  }
}