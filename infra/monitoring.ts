import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';

/**
 * Creates a CloudWatch dashboard for the PR Grim Reaper.
 * That absolutely no one will ever look at.
 */
export function createDashboard(
  warningFunction: aws.lambda.Function,
  executionFunction: aws.lambda.Function,
  tableName: pulumi.Output<string>
): aws.cloudwatch.Dashboard {
  return new aws.cloudwatch.Dashboard('pr-grim-reaper-dashboard', {
    dashboardName: 'PR-Grim-Reaper-Metrics',
    dashboardBody: pulumi.interpolate`${JSON.stringify({
      widgets: [
        // Title widget
        {
          type: 'text',
          x: 0,
          y: 0,
          width: 24,
          height: 1,
          properties: {
            markdown: '# PR Grim Reaper Metrics\nMetrics for Pull Request warnings and executions'
          }
        },
        // Warning function invocations
        {
          type: 'metric',
          x: 0,
          y: 1,
          width: 8,
          height: 6,
          properties: {
            title: 'Warning Function Invocations',
            view: 'timeSeries',
            stacked: false,
            metrics: [
              ['AWS/Lambda', 'Invocations', 'FunctionName', warningFunction.name]
            ],
            region: 'us-east-1',
            period: 86400, // 1 day
            stat: 'Sum'
          }
        },
        // Execution function invocations
        {
          type: 'metric',
          x: 8,
          y: 1,
          width: 8,
          height: 6,
          properties: {
            title: 'Execution Function Invocations',
            view: 'timeSeries',
            stacked: false,
            metrics: [
              ['AWS/Lambda', 'Invocations', 'FunctionName', executionFunction.name]
            ],
            region: 'us-east-1',
            period: 86400, // 1 day
            stat: 'Sum'
          }
        },
        // Function errors
        {
          type: 'metric',
          x: 16,
          y: 1,
          width: 8,
          height: 6,
          properties: {
            title: 'Function Errors',
            view: 'timeSeries',
            stacked: false,
            metrics: [
              ['AWS/Lambda', 'Errors', 'FunctionName', warningFunction.name],
              ['AWS/Lambda', 'Errors', 'FunctionName', executionFunction.name]
            ],
            region: 'us-east-1',
            period: 86400, // 1 day
            stat: 'Sum'
          }
        },
        // DynamoDB operations
        {
          type: 'metric',
          x: 0,
          y: 7,
          width: 12,
          height: 6,
          properties: {
            title: 'DynamoDB Operations',
            view: 'timeSeries',
            stacked: false,
            metrics: [
              ['AWS/DynamoDB', 'GetItem.Count', 'TableName', tableName],
              ['AWS/DynamoDB', 'PutItem.Count', 'TableName', tableName],
              ['AWS/DynamoDB', 'Query.Count', 'TableName', tableName]
            ],
            region: 'us-east-1',
            period: 86400, // 1 day
            stat: 'Sum'
          }
        },
        // Function duration
        {
          type: 'metric',
          x: 12,
          y: 7,
          width: 12,
          height: 6,
          properties: {
            title: 'Function Duration',
            view: 'timeSeries',
            stacked: false,
            metrics: [
              ['AWS/Lambda', 'Duration', 'FunctionName', warningFunction.name],
              ['AWS/Lambda', 'Duration', 'FunctionName', executionFunction.name]
            ],
            region: 'us-east-1',
            period: 86400, // 1 day
            stat: 'Average'
          }
        }
      ]
    })}`
  });
}