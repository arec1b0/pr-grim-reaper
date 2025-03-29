import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import { readFileSync } from 'fs';
import * as path from 'path';

interface LambdaFunctionProps {
  name: string;
  handler: string;
  environment: Record<string, pulumi.Output<string> | string>;
  timeout?: number;
  memorySize?: number;
  role: aws.iam.Role;
}

/**
 * Creates a Lambda function with our standard configuration.
 * Because apparently this wasn't complex enough already.
 */
export function createLambdaFunction(props: LambdaFunctionProps): aws.lambda.Function {
  const { name, handler, environment, timeout = 60, memorySize = 128, role } = props;
  
  // Create a Lambda function
  return new aws.lambda.Function(name, {
    runtime: 'nodejs18.x',
    handler,
    role: role.arn,
    timeout,
    memorySize,
    environment: {
      variables: environment,
    },
    code: new pulumi.asset.AssetArchive({
      // We're pretending the build process has already happened
      '.': new pulumi.asset.FileArchive('./dist'),
    }),
    tags: {
      Name: name,
      Project: 'pr-grim-reaper',
      Environment: 'production',
    },
  });
}

/**
 * Creates the execution role for our Lambda functions.
 * With permissions that are definitely not overly broad.
 */
export function createLambdaRole(name: string, dynamoTableArn: pulumi.Output<string>): aws.iam.Role {
  // Create an IAM role for the Lambda functions
  const role = new aws.iam.Role(name, {
    assumeRolePolicy: JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Action: 'sts:AssumeRole',
        Effect: 'Allow',
        Principal: {
          Service: 'lambda.amazonaws.com',
        },
      }],
    }),
  });

  // Attach basic Lambda execution policy
  new aws.iam.RolePolicyAttachment(`${name}-basic-execution`, {
    role: role.name,
    policyArn: 'arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole',
  });

  // Create a policy for DynamoDB access
  const dynamoPolicy = new aws.iam.Policy(`${name}-dynamo-policy`, {
    policy: {
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Action: [
          'dynamodb:GetItem',
          'dynamodb:PutItem',
          'dynamodb:UpdateItem',
          'dynamodb:DeleteItem',
          'dynamodb:Query',
          'dynamodb:Scan',
        ],
        Resource: pulumi.interpolate`[
          ${dynamoTableArn},
          ${dynamoTableArn}/index/*
        ]`,
      }],
    },
  });

  // Attach the DynamoDB policy to the role
  new aws.iam.RolePolicyAttachment(`${name}-dynamo-attachment`, {
    role: role.name,
    policyArn: dynamoPolicy.arn,
  });

  return role;
}