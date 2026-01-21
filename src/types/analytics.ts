export type TimeRange = '7d' | '30d' | '90d' | 'all';

export interface AnalyticsSummary {
  totalPosts: number;
  successRate: number;
  failedCount: number;
  mostUsedPlatform: string | null;
  busiestDay: string | null;
}

export interface ActivityChartData {
  labels: string[];
  success: number[];
  failed: number[];
}

export interface PlatformVolume {
  facebook: number;
  twitter: number;
  instagram: number;
  telegram: number;
}

export interface PlatformReliability {
  facebook: number;
  twitter: number;
  instagram: number;
  telegram: number;
}

export interface AnalyticsResponse {
  summary: AnalyticsSummary;
  activityChart: ActivityChartData;
  platformVolume: PlatformVolume;
  platformReliability: PlatformReliability;
}

export interface AnalyticsPost {
  id: number;
  created_at: string;
  content: string;
  publish_status: 'success' | 'partial_success' | 'failed';
  publish_report: string | null;
}

export interface AnalyticsPostsResponse {
  posts: AnalyticsPost[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
