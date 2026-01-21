# Analytics Page Design

## Overview

Add an analytics page to Mocking-Bird that provides insights into publishing performance and usage patterns. All data is derived from the existing `publish_history` table.

## Features

### Time Range Selection
- Multiple presets: 7 days, 30 days, 90 days, All time
- Pill button selector at top of page
- All components respect selected range

### Summary Cards (5 cards)

| Card | Metric | Secondary Info |
|------|--------|----------------|
| Total Posts | Count of publish attempts | vs. previous period |
| Success Rate | Percentage with color indicator | Green >90%, Yellow 70-90%, Red <70% |
| Failed Posts | Count needing attention | Links to filtered table |
| Most Used Platform | Platform name + icon | e.g. "Twitter (47%)" |
| Busiest Day | Day of week | e.g. "Tuesdays" |

### Charts

**1. Publishing Activity Over Time (Line/Bar Chart)**
- X-axis: Time (days for 7/30d, weeks for 90d/all)
- Y-axis: Number of posts
- Data: Stacked bars showing successful vs. failed posts
- Purpose: Spot trends in publishing frequency and failure rates

**2. Platform Volume (Donut Chart)**
- Segments per platform (Facebook, Twitter, Instagram, Telegram)
- Center text: Total post count
- Purpose: Visualize platform usage distribution

**3. Platform Reliability (Horizontal Bar Chart)**
- One bar per platform showing success rate percentage
- Color-coded by reliability threshold
- Purpose: Identify which platforms are most/least reliable

### Posts Table

**Columns:**
| Column | Description |
|--------|-------------|
| Date/Time | When the post was published |
| Content | Truncated preview (50 chars) with tooltip |
| Platforms | Icons showing targeted platforms |
| Status | Success/Partial/Failed badge |
| Results | Per-platform status icons |
| Details | Expandable row for error messages |

**Filters:**
- Platform: All, Facebook, Twitter, Instagram, Telegram
- Status: All, Success, Partial, Failed
- Date range: Inherits from page selector

**Behavior:**
- Default sort: Newest first
- Sortable columns
- Expandable rows for full content and error details
- Pagination: 20 posts per page

## Technical Design

### API Endpoints

**GET /api/analytics**

Query params:
- `range`: `7d` | `30d` | `90d` | `all`

Response:
```typescript
{
  summary: {
    totalPosts: number;
    successRate: number;
    failedCount: number;
    mostUsedPlatform: string;
    busiestDay: string;
  },
  activityChart: {
    labels: string[];
    success: number[];
    failed: number[];
  },
  platformVolume: {
    facebook: number;
    twitter: number;
    instagram: number;
    telegram: number;
  },
  platformReliability: {
    facebook: number;
    twitter: number;
    instagram: number;
    telegram: number;
  }
}
```

**GET /api/analytics/posts**

Query params:
- `range`: `7d` | `30d` | `90d` | `all`
- `platform`: optional filter
- `status`: optional filter
- `page`: page number (default 1)
- `limit`: items per page (default 20)

Response:
```typescript
{
  posts: Array<{
    id: string;
    created_at: string;
    content: string;
    platforms: string[];
    status: 'success' | 'partial' | 'failed';
    results: Record<string, { success: boolean; error?: string }>;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }
}
```

### Data Source

All data aggregated from existing `publish_history` table using SQL:
- `GROUP BY` for aggregations
- Date functions for time-based filtering
- No new database tables required

### File Structure

```
/src/app/analytics/
  page.tsx                      # Main page component

/src/components/analytics/
  TimeRangeSelector.tsx         # Pill buttons for time range
  SummaryCards.tsx              # Row of 5 metric cards
  ActivityChart.tsx             # Line/bar chart over time
  PlatformVolumeChart.tsx       # Donut chart
  PlatformReliabilityChart.tsx  # Horizontal bar chart
  PostsTable.tsx                # Filterable table
  PostsTableFilters.tsx         # Filter dropdowns
  PostsTableRow.tsx             # Expandable row component

/src/hooks/
  useAnalytics.ts               # Fetches summary + chart data
  useAnalyticsPosts.ts          # Fetches paginated posts

/src/app/api/analytics/
  route.ts                      # Summary + chart data endpoint
  posts/route.ts                # Paginated posts endpoint
```

### Dependencies

- **Recharts**: React charting library for all visualizations
- Existing MUI components for cards, tables, buttons

### Navigation

Add "Analytics" link to Navbar component.

## UI/UX Notes

- Follow existing MUI v7 patterns and color palette
- Cards with subtle shadows, consistent spacing
- Responsive: Charts side-by-side on desktop, stacked on mobile
- Empty states with friendly messages when no data matches filters
