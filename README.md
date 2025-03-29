# pr-grim-reaper

A tool that does what your cowardly team refuses to do: close abandoned pull requests.

[![Code style: Whatever works](https://img.shields.io/badge/code%20style-whatever%20works-blue.svg)](https://github.com)
[![PRs: Automatically Closed](https://img.shields.io/badge/PRs-automatically%20closed-red.svg)](https://github.com)
[![Feelings: Ignored](https://img.shields.io/badge/feelings-ignored-purple.svg)](https://github.com)

## Overview

Every GitHub repository eventually becomes a graveyard of abandoned pull requests that nobody has the courage to close. Developers get distracted by shiny new projects, managers forget to follow up, and those PR notifications everyone muted months ago continue to pile up like digital dust.

This tool automates what should be a basic human responsibility: cleaning up after yourself.

## Features

- Automatically identifies PRs that haven't been touched in X days
- Posts customizable passive-aggressive comments before execution
- Closes PRs with the cold efficiency of someone who doesn't care about your feelings
- Generates metrics that management will briefly glance at during quarterly reviews
- Tracks close rates so you can shame teams with the worst abandonment issues
- Override system for those special PRs everyone pretends they'll get back to someday

## Installation

Prerequisites:

- Pulumi CLI
- AWS account
- GitHub token with repo permissions
- Basic competence

```bash
# Clone the repo
git clone https://github.com/arec1b0/pr-grim-reaper.git

# Install dependencies 
cd pr-grim-reaper
npm install   # or yarn, if you're feeling trendy

# Configure Pulumi (yes, you have to actually do this part)
pulumi stack init dev
pulumi config set aws:region us-east-1  # or whatever region you pay too much for
pulumi config set --secret github:token YOUR_GITHUB_TOKEN

# Deploy (and pray to the cloud gods)
pulumi up
```

If any of these steps confuse you, perhaps infrastructure automation isn't your calling.

## Configuration

Edit `config.yaml` to set your preferences. All parameters have sensible defaults because unlike your product managers, I don't expect you to make important decisions without guidance.

```yaml
reaper:
  # How many days of inactivity before warning
  warningThreshold: 14
  
  # How many days after warning before closing
  executionThreshold: 7
  
  # Which repositories to target (leave empty for all)
  repositories: []
  
  # Override labels that will spare a PR from the reaper
  immunityLabels: ["do-not-close", "work-in-progress"]
  
  # Execution schedule (cron syntax)
  schedule: "0 4 * * 1"  # Every Monday at 4am, when nobody's watching
  
messages:
  # Warning template (supports variables)
  warning: "This PR has been inactive for {{days}} days. It will be automatically closed in 7 days unless activity is detected. The machines are watching."
  
  # Closing template (supports variables)
  closing: "This PR has been closed due to {{days}} days of inactivity. Your code has been judged by the algorithm and found wanting."
  
  # Override template (when someone adds an immunity label)
  reprieve: "This PR has been granted a temporary stay of execution. The reaper will return."
```

## How It Works

The architecture is painfully simple:

1. Lambda function queries GitHub for PRs matching abandonment criteria
2. First pass: Posts warning comments and records in DynamoDB
3. Second pass: Checks if warned PRs have become active; if not, executes
4. EventBridge rules trigger these functions on the schedule you set
5. CloudWatch dashboard displays metrics on PR abandonment rates

All wrapped in Pulumi IaC that's marginally more maintainable than raw CloudFormation.

## Logs & Metrics

The reaper logs its kills to CloudWatch. Access them in the AWS console, if you must:

- `/aws/lambda/pr-reaper-warning`
- `/aws/lambda/pr-reaper-execution`

A dashboard is automatically created showing:

- PRs warned vs. executed
- Average lifespan of abandoned PRs
- Leaderboard of repeat offenders
- Repositories with worst abandonment rates

Screenshot these for your next team meeting and watch the uncomfortable silence.

## Limitations

- Cannot fix your team's fundamental communication problems
- Will not make stakeholders any less fickle about requirements
- Does nothing to address why developers abandon PRs in the first place
- May cause passive-aggressive Slack messages

## License

MIT - Do whatever you want, I don't care.

---

*Created for the Pulumi Deploy and Document Challenge, because apparently adding GitHub badges to a project is still impressive in 2025.*
