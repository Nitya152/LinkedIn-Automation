export interface AutomationConfig {
  baseUrl: string;
  apiKey: string;
  accountId: string;
  targetInput: string;
  message: string;
  sendWithoutNote: boolean;
  limit: number;
  reactionType: 'like' | 'celebrate' | 'support' | 'love' | 'insightful' | 'funny';
  commentText: string;
}

export type StepStatus = 'pending' | 'running' | 'success' | 'skipped' | 'error';

export interface AutomationStepLog {
  step: number;
  title: string;
  method: string;
  endpoint: string;
  url: string;
  status: StepStatus;
  summary: string;
  timestamp: string;
  requestBody?: any;
  rawResponse?: any;
  error?: string;
}

export interface ProfileInfo {
  provider_id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  headline?: string;
  network_distance?: string;
  is_relationship?: boolean;
  profile_picture_url?: string;
  public_identifier?: string;
  location?: string;
  invitation?: {
    status?: string;
    sent_at?: string;
  };
  raw?: any;
}

export interface PostItem {
  id?: string;
  social_id: string;
  text?: string;
  parsed_datetime?: string;
  date?: string;
  like_count?: number;
  comment_count?: number;
  repost_count?: number;
  reaction_counts?: Record<string, number>;
  permissions?: {
    can_react?: boolean;
    can_post_comments?: boolean;
    can_share?: boolean;
  };
  attachments?: any[];
  author?: {
    name?: string;
    headline?: string;
    profile_picture_url?: string;
  };
  raw?: any;
}

export interface AutomationResponse {
  success: boolean;
  logs: AutomationStepLog[];
  profile?: ProfileInfo | null;
  posts?: PostItem[];
  latestPost?: PostItem | null;
  error?: string;
}

export interface ConnectedAccount {
  id: string;
  name?: string;
  provider?: string;
  status?: string;
  created_at?: string;
}

export interface BatchProfileResult {
  id: string;
  slug: string;
  originalInput: string;
  accountId: string;
  status: 'queued' | 'waiting_delay' | 'running' | 'success' | 'partial' | 'error' | 'skipped';
  delayBeforeMinutes: number;
  delayBeforeMs: number;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  profile?: ProfileInfo | null;
  postsCount?: number;
  latestPostSocialId?: string;
  latestPostText?: string;
  connectionOutcome?: string;
  reactionOutcome?: string;
  commentOutcome?: string;
  logs: AutomationStepLog[];
  error?: string;
}

export interface BatchSettings {
  minDelayMinutes: number;
  maxDelayMinutes: number;
  stopOnError: boolean;
}

