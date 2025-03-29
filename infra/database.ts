import * as aws from '@pulumi/aws';

/**
 * DynamoDB table for PR tracking.
 * Because SQLite would be too sensible for this use case.
 */
export function createDatabase(name: string): aws.dynamodb.Table {
  return new aws.dynamodb.Table(name, {
    attributes: [
      { name: 'id', type: 'S' },
      { name: 'status', type: 'S' }
    ],
    hashKey: 'id',
    billingMode: 'PAY_PER_REQUEST', // Because who knows how many records we'll have (probably 5)
    globalSecondaryIndexes: [{
      name: 'StatusIndex',
      hashKey: 'status',
      projectionType: 'ALL',
    }],
    tags: {
      Name: name,
      Project: 'pr-grim-reaper',
      Environment: 'production', // Being optimistic that this will ever reach production
    },
  });
}