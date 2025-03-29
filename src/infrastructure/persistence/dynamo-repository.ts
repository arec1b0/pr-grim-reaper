import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument, GetCommand, PutCommand, UpdateCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { PullRequestRecord, PullRequestStatus } from '../../domain/entities/pull-request';

/**
 * Repository to store our PR metadata in DynamoDB,
 * because JSON files would be too simple.
 */
export class PullRequestRepository {
  private readonly tableName: string;
  private readonly docClient: DynamoDBDocument;
  
  constructor(tableName: string, region: string) {
    this.tableName = tableName;
    this.docClient = DynamoDBDocument.from(new DynamoDB({ region }));
  }

  /**
   * Create a new PR record with all the overengineered metadata
   * we'll probably never actually use.
   */
  async create(record: PullRequestRecord): Promise<void> {
    try {
      await this.docClient.send(new PutCommand({
        TableName: this.tableName,
        Item: record
      }));
    } catch (error) {
      console.error(`Error creating record for ${record.repositoryFullName}#${record.prNumber}:`, error);
      throw error;
    }
  }

  /**
   * Update a PR record with its new, inevitably worse status.
   */
  async update(record: PullRequestRecord): Promise<void> {
    try {
      await this.docClient.send(new PutCommand({
        TableName: this.tableName,
        Item: record
      }));
    } catch (error) {
      console.error(`Error updating record for ${record.repositoryFullName}#${record.prNumber}:`, error);
      throw error;
    }
  }

  /**
   * Find a PR record by repository and PR number.
   * Returns undefined if we've never seen it, which is concerningly common.
   */
  async findByRepoAndPrNumber(
    repositoryFullName: string,
    prNumber: number
  ): Promise<PullRequestRecord | undefined> {
    try {
      const id = `${repositoryFullName}#${prNumber}`;
      
      const result = await this.docClient.send(new GetCommand({
        TableName: this.tableName,
        Key: { id }
      }));
      
      return result.Item as PullRequestRecord | undefined;
    } catch (error) {
      console.error(`Error finding record for ${repositoryFullName}#${prNumber}:`, error);
      throw error;
    }
  }

  /**
   * Find PRs by status using a query that will be painfully slow
   * once you have more than 10 records.
   */
  async findByStatus(status: PullRequestStatus): Promise<PullRequestRecord[]> {
    try {
      // DynamoDB doesn't support filtering by non-key attributes without using a GSI
      // or scan, which is inefficient. But for our tiny dataset, who cares?
      const result = await this.docClient.send(new QueryCommand({
        TableName: this.tableName,
        IndexName: 'StatusIndex',
        KeyConditionExpression: 'status = :status',
        ExpressionAttributeValues: {
          ':status': status
        }
      }));
      
      return (result.Items || []) as PullRequestRecord[];
    } catch (error) {
      console.error(`Error finding records with status ${status}:`, error);
      throw error;
    }
  }
}

export interface PullRequestRepository {
  create(record: PullRequestRecord): Promise<void>;
  update(record: PullRequestRecord): Promise<void>;
  findByRepoAndPrNumber(repositoryFullName: string, prNumber: number): Promise<PullRequestRecord | undefined>;
  findByStatus(status: PullRequestStatus): Promise<PullRequestRecord[]>;
}