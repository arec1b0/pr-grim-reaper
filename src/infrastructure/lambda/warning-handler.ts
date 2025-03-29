import { ReaperService } from '../../domain/services/reaper-service';
import { GitHubClient } from '../github/github-client';
import { PullRequestRepository } from '../persistence/dynamo-repository';
import { ConfigService } from '../../config/config.js';

/**
 * Lambda handler for the PR warning function.
 * Just a thin wrapper around ReaperService because AWS needs an entry point.
 */
export const handler = async (): Promise<void> => {
  console.log('PR Grim Reaper - Warning Function Started');
  
  try {
    // Get config from environment variables because we're cloud-native™
    const config = new ConfigService(process.env);
    
    // Connect to GitHub with our definitely-not-overprivileged token
    const githubClient = new GitHubClient(config.getGitHubToken());
    
    // Connect to DynamoDB to store our metadata
    const repository = new PullRequestRepository(
      config.getDynamoTableName(),
      process.env.AWS_REGION || 'us-east-1'
    );
    
    // Create the service with our dependencies
    const reaperService = new ReaperService(githubClient, repository, config);
    
    // Let the reaping begin
    await reaperService.findAndWarnAbandonedPRs();
    
    console.log('PR Grim Reaper - Warning Function Completed');
  } catch (error) {
    console.error('Error in PR Grim Reaper warning function:', error);
    throw error;
  }
};