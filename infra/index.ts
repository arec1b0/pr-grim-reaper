import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';
import { createDatabase } from './database';
import { createLambdaFunction, createLambdaRole } from './functions';
import { createScheduleRules } from './scheduler';
import { createDashboard } from './monitoring';

// Get configuration
const config = new pulumi.Config();
const githubToken = config.requireSecret('githubToken');
const repositories = config.get('repositories') || '';
const warningThreshold = config.get('warningThresholdDays') || '14';
const executionThreshold = config.get('executionThresholdDays') || '7';
const immunityLabels = config.get('immunityLabels') || 'do-not-close,work-in-progress';
const schedule = config.get('schedule') || '0 4 * * 1'; // Default: Every Monday at 4am
const warningMessage = config.get('warningMessage') || '';
const closingMessage = config.get('closingMessage') || '';
const reprieveMessage = config.get('reprieveMessage') || '';

// Create DynamoDB table
const table = createDatabase('pr-grim-reaper-records');

// Create IAM role for Lambda functions
const lambdaRole = createLambdaRole('pr-grim-reaper-role', pulumi.interpolate`${table.arn}`);

// Common environment variables for both functions
const commonEnvironment: Record<string, pulumi.Output<string> | string> = {
  GITHUB_TOKEN: githubToken,
  DYNAMODB_TABLE: table.name,
  REPOSITORIES: repositories,
  WARNING_THRESHOLD_DAYS: warningThreshold,
  EXECUTION_THRESHOLD_DAYS: executionThreshold,
  IMMUNITY_LABELS: immunityLabels,
};

// Add optional message templates if provided
if (warningMessage) {
  commonEnvironment.WARNING_MESSAGE = warningMessage;
}

if (closingMessage) {
  commonEnvironment.CLOSING_MESSAGE = closingMessage;
}

if (reprieveMessage) {
  commonEnvironment.REPRIEVE_MESSAGE = reprieveMessage;
}

// Create Lambda functions
const warningFunction = createLambdaFunction({
  name: 'pr-grim-reaper-warning',
  handler: 'infrastructure/lambda/warning-handler.handler',
  environment: commonEnvironment,
  role: lambdaRole,
});

const executionFunction = createLambdaFunction({
  name: 'pr-grim-reaper-execution',
  handler: 'infrastructure/lambda/execution-handler.handler',
  environment: commonEnvironment,
  role: lambdaRole,
});

// Create schedule rules
createScheduleRules(warningFunction, executionFunction, schedule);

// Create CloudWatch dashboard
const dashboard = createDashboard(warningFunction, executionFunction, pulumi.interpolate`${table.name}`);

// Export outputs
export const tableName = table.name;
export const warningFunctionName = warningFunction.name;
export const executionFunctionName = executionFunction.name;
export const dashboardUrl = pulumi.interpolate`https://console.aws.amazon.com/cloudwatch/home?dashboards:name=${dashboard.dashboardName}`;
export const readme = `
# PR Grim Reaper

This infrastructure automatically identifies and closes abandoned GitHub pull requests to maintain repository cleanliness and improve team productivity.

## Overview

The PR Grim Reaper runs on a scheduled basis to:
1. Identify pull requests that have been inactive for a configurable period
2. Post warning comments on abandoned PRs
3. Close PRs that remain inactive after the warning period
4. Generate metrics on PR abandonment rates

## Architecture

This stack deploys the following AWS resources:

* **Lambda Functions**: Two functions handle the warning and execution phases
* **DynamoDB Table**: Tracks PR status and interaction history
* **EventBridge Rules**: Schedule the functions to run automatically
* **CloudWatch Dashboard**: Provides visibility into system performance

## Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| githubToken | GitHub API token with repo access | Required |
| repositories | Comma-separated list of repos to monitor | All accessible repos |
| warningThresholdDays | Days of inactivity before warning | 14 |
| executionThresholdDays | Days after warning before closing | 7 |
| immunityLabels | Labels that prevent PR closure | do-not-close,work-in-progress |
| schedule | Cron expression for execution schedule | 0 4 * * 1 (Mondays at 4am) |

## Usage

The system runs automatically on the configured schedule. No manual intervention is required after deployment.

## Dashboard

View operational metrics at: ${dashboardUrl}
`;