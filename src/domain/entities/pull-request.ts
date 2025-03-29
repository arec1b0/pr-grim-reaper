/**
 * Represents a Pull Request that's been abandoned by developers who found something 
 * shinier to work on.
 */
export interface PullRequest {
    id: number;
    repositoryFullName: string;
    number: number;
    title: string;
    url: string;
    createdAt: string;
    updatedAt: string;
    inactivityDays: number;
    authorLogin: string;
    labels: string[];
}

/**
 * Status of a PR in our workflow of ruthless automation.
 */
export enum PullRequestStatus {
    ACTIVE = 'ACTIVE',
    WARNED = 'WARNED',
    EXECUTED = 'EXECUTED',
    IMMUNE = 'IMMUNE'
}

/**
 * Record of our interactions with a PR, stored in DynamoDB until
 * AWS decides to change their NoSQL implementation again.
 */
export interface PullRequestRecord {
    id: string;
    repositoryFullName: string;
    prNumber: number;
    status: PullRequestStatus;
    warningPostedAt?: string;
    executedAt?: string;
    lastCheckedAt: string;
}