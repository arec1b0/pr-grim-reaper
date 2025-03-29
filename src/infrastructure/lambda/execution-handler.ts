import { ReaperService } from '../../domain/services/reaper-service';
import { GitHubClient } from '../github/github-client';
import { PullRequestRepository } from '../persistence/dynamo-repository';
import { ConfigService } from '../../config/config';
/**
 * Lambda handler for the PR execution function.
 * The digital grim reaper that closes PRs without remorse.
 */
export const handler = async (): Promise<void> => {
  console.log('PR Grim Reaper - Execution Function Started');
  
  try {
    // Get config from environment variables
    const config = new ConfigService(process.env);
    
    // Connect to GitHub with our token
    const githubClient = new GitHubClient(config.getGitHubToken());
    
    // Connect to DynamoDB to store our metadata
    const repository = new PullRequestRepository(
      config.getDynamoTableName(),
      process.env.AWS_REGION || 'us-east-1'
    );
    
    // Create the service with our dependencies
    const reaperService = new ReaperService(githubClient, repository, config);
    
    // Execute previously warned PRs
    await reaperService.findAndExecuteWarned();
    
    console.log('PR Grim Reaper - Execution Function Completed');
  } catch (error) {
    console.error('Error in PR Grim Reaper execution function:', error);
    throw error;
  }
};