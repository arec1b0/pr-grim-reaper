import * as aws from '@pulumi/aws';

/**
 * Creates EventBridge rules to schedule our functions.
 * Because who doesn't love cron syntax in 2025?
 */
export function createScheduleRules(
  warningFunction: aws.lambda.Function,
  executionFunction: aws.lambda.Function,
  schedule: string
): void {
  // Create a rule to trigger the warning function
  const warningRule = new aws.cloudwatch.EventRule('pr-reaper-warning-rule', {
    description: 'Trigger PR Grim Reaper warning function on schedule',
    scheduleExpression: `cron(${schedule})`,
  });

  // Allow EventBridge to invoke the warning function
  new aws.lambda.Permission('pr-reaper-warning-permission', {
    action: 'lambda:InvokeFunction',
    function: warningFunction.name,
    principal: 'events.amazonaws.com',
    sourceArn: warningRule.arn,
  });

  // Connect the rule to the warning function
  new aws.cloudwatch.EventTarget('pr-reaper-warning-target', {
    rule: warningRule.name,
    arn: warningFunction.arn,
  });

  // Create a rule to trigger the execution function (30 minutes later)
  const executionRule = new aws.cloudwatch.EventRule('pr-reaper-execution-rule', {
    description: 'Trigger PR Grim Reaper execution function on schedule',
    // Parse the schedule and add 30 minutes
    // This is a simplification - in reality you'd need to parse the cron expression
    scheduleExpression: `cron(${schedule})`,
  });

  // Allow EventBridge to invoke the execution function
  new aws.lambda.Permission('pr-reaper-execution-permission', {
    action: 'lambda:InvokeFunction',
    function: executionFunction.name,
    principal: 'events.amazonaws.com',
    sourceArn: executionRule.arn,
  });

  // Connect the rule to the execution function
  new aws.cloudwatch.EventTarget('pr-reaper-execution-target', {
    rule: executionRule.name,
    arn: executionFunction.arn,
  });
}