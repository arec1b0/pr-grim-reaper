/**
 * Configuration service that enforces our rigid worldview.
 * Because environment variables are the new config files.
 */
export interface ConfigService {
    getRepositories(): string[];
    getWarningThresholdDays(): number;
    getExecutionThresholdDays(): number;
    getImmunityLabels(): string[];
    getWarningMessage(): string;
    getClosingMessage(): string;
    getReprieveMessage(): string;
    getGitHubToken(): string;
    getDynamoTableName(): string;
}

export class ConfigService implements ConfigService {
    constructor(private readonly env: NodeJS.ProcessEnv) {}

    getRepositories(): string[] {
        const reposString = this.env.REPOSITORIES || '';
        return reposString ? reposString.split(',').map(r => r.trim()) : [];
    }

    getWarningThresholdDays(): number {
        return parseInt(this.env.WARNING_THRESHOLD_DAYS || '14', 10);
    }

    getExecutionThresholdDays(): number {
        return parseInt(this.env.EXECUTION_THRESHOLD_DAYS || '7', 10);
    }

    getImmunityLabels(): string[] {
        const labelsString = this.env.IMMUNITY_LABELS || 'do-not-close,work-in-progress';
        return labelsString.split(',').map(l => l.trim());
    }

    getWarningMessage(): string {
        return this.env.WARNING_MESSAGE || 
            'This PR has been inactive for {{days}} days. It will be automatically closed in 7 days unless activity is detected.';
    }

    getClosingMessage(): string {
        return this.env.CLOSING_MESSAGE || 
            'This PR has been closed due to {{days}} days of inactivity.';
    }

    getReprieveMessage(): string {
        return this.env.REPRIEVE_MESSAGE || 
            'This PR has been granted a temporary stay of execution.';
    }

    getGitHubToken(): string {
        const token = this.env.GITHUB_TOKEN;
        if (!token) {
            throw new Error('GITHUB_TOKEN is required');
        }
        return token;
    }

    getDynamoTableName(): string {
        return this.env.DYNAMODB_TABLE || 'pr-grim-reaper-records';
    }
}