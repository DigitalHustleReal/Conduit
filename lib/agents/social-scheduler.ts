/**
 * Social Scheduler -- queues and posts content at optimal times.
 * Manages a posting calendar across all platforms.
 *
 * Pure logic, 0 AI credits. Works with repurposed content from repurposer.ts.
 */

import type { RepurposedContent, RepurposeFormat } from '@/lib/agents/repurposer';
import { PLATFORM_LIMITS } from '@/lib/agents/repurposer';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ScheduledPost {
  id: string;
  platform: RepurposeFormat;
  content: string;
  articleId: number;
  articleTitle: string;
  scheduledTime: number;
  status: 'scheduled' | 'posting' | 'posted' | 'failed';
  hashtags: string[];
  mediaUrls?: string[];
}

export interface PostingRules {
  maxPostsPerDayPerPlatform: number;
  minHoursBetweenPosts: number;
  blackoutHours: { start: number; end: number };
}

export interface PostingCalendar {
  posts: ScheduledPost[];
  rules: PostingRules;
}

// ---------------------------------------------------------------------------
// Defaults
// ---------------------------------------------------------------------------

export function getDefaultCalendar(): PostingCalendar {
  return {
    posts: [],
    rules: {
      maxPostsPerDayPerPlatform: 2,
      minHoursBetweenPosts: 4,
      blackoutHours: { start: 23, end: 6 },
    },
  };
}

// ---------------------------------------------------------------------------
// Optimal time calculation
// ---------------------------------------------------------------------------

const PLATFORM_OPTIMAL_HOURS: Record<string, number[]> = {
  'twitter-thread': [9, 10, 11],
  'twitter-single': [9, 10, 12],
  'linkedin-post': [8, 9, 10],
  'linkedin-carousel': [8, 9, 10],
  'instagram-caption': [11, 12, 13],
  'instagram-carousel': [11, 12, 13],
  'youtube-script': [10, 14, 17],
  'youtube-shorts': [18, 19, 20],
  'email-newsletter': [10, 11],
  'reddit-post': [6, 7, 8],
  'quora-answer': [10, 14],
  'pinterest-pin': [20, 21, 22],
  'podcast-outline': [9, 10],
  'infographic-outline': [10, 14],
  'slide-deck': [9, 10],
  'whatsapp-forward': [9, 12, 18],
  'medium-crosspost': [8, 9, 10],
};

/**
 * Find the next available time slot that respects posting rules.
 */
function findNextSlot(
  platform: RepurposeFormat,
  existingPosts: ScheduledPost[],
  rules: PostingRules,
  timezone: string,
  startFrom?: number,
): number {
  const now = startFrom || Date.now();
  const optimalHours = PLATFORM_OPTIMAL_HOURS[platform] || [9, 10, 14];

  // Get current hour in user timezone
  let currentHour: number;
  try {
    const timeStr = new Date(now).toLocaleTimeString('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: timezone,
    });
    currentHour = parseInt(timeStr, 10);
  } catch {
    currentHour = new Date(now).getHours();
  }

  // Filter out posts for this platform
  const platformPosts = existingPosts.filter(
    (p) => p.platform === platform && (p.status === 'scheduled' || p.status === 'posted'),
  );

  // Try to find a slot over the next 7 days
  for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
    const dayStart = now + dayOffset * 86400000;
    const dayDate = new Date(dayStart);

    // Count posts for this day
    const postsThisDay = platformPosts.filter((p) => {
      const postDate = new Date(p.scheduledTime);
      return (
        postDate.getFullYear() === dayDate.getFullYear() &&
        postDate.getMonth() === dayDate.getMonth() &&
        postDate.getDate() === dayDate.getDate()
      );
    });

    if (postsThisDay.length >= rules.maxPostsPerDayPerPlatform) continue;

    // Try each optimal hour
    for (const hour of optimalHours) {
      // Skip if hour already passed today
      if (dayOffset === 0 && hour <= currentHour) continue;

      // Skip blackout hours
      if (rules.blackoutHours.start < rules.blackoutHours.end) {
        if (hour >= rules.blackoutHours.start && hour < rules.blackoutHours.end) continue;
      } else {
        if (hour >= rules.blackoutHours.start || hour < rules.blackoutHours.end) continue;
      }

      // Check minimum hours between posts
      const candidateTime = new Date(dayStart);
      candidateTime.setHours(hour, Math.floor(Math.random() * 30), 0, 0);
      const candidateTs = candidateTime.getTime();

      const tooClose = platformPosts.some(
        (p) =>
          Math.abs(p.scheduledTime - candidateTs) <
          rules.minHoursBetweenPosts * 3600000,
      );
      if (tooClose) continue;

      return candidateTs;
    }
  }

  // Fallback: schedule tomorrow at first optimal hour
  const tomorrow = new Date(now + 86400000);
  tomorrow.setHours(optimalHours[0] || 9, 0, 0, 0);
  return tomorrow.getTime();
}

// ---------------------------------------------------------------------------
// Core API
// ---------------------------------------------------------------------------

/**
 * Schedule repurposed content at optimal times.
 */
export function scheduleRepurposedContent(
  repurposed: RepurposedContent[],
  existingCalendar: PostingCalendar,
  timezone: string,
): ScheduledPost[] {
  const newPosts: ScheduledPost[] = [];
  const allPosts = [...existingCalendar.posts, ...newPosts];

  for (const item of repurposed) {
    const scheduledTime = findNextSlot(
      item.format,
      allPosts,
      existingCalendar.rules,
      timezone,
    );

    const post: ScheduledPost = {
      id: `post_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      platform: item.format,
      content: item.content,
      articleId: (item.metadata.articleId as number) || 0,
      articleTitle: (item.metadata.articleTitle as string) || item.title,
      scheduledTime,
      status: 'scheduled',
      hashtags: item.hashtags || [],
    };

    newPosts.push(post);
    allPosts.push(post);
  }

  return newPosts;
}

/**
 * Get the next N posts to be published.
 */
export function getUpcomingPosts(
  calendar: PostingCalendar,
  count: number,
): ScheduledPost[] {
  return calendar.posts
    .filter((p) => p.status === 'scheduled')
    .sort((a, b) => a.scheduledTime - b.scheduledTime)
    .slice(0, count);
}

/**
 * Get posting analytics.
 */
export function getPostingStats(calendar: PostingCalendar): {
  scheduledThisWeek: number;
  postedThisWeek: number;
  platformBreakdown: Record<string, number>;
  nextPostTime: string;
} {
  const weekAgo = Date.now() - 7 * 86400000;
  const weekPosts = calendar.posts.filter((p) => p.scheduledTime > weekAgo);

  const scheduledThisWeek = weekPosts.filter((p) => p.status === 'scheduled').length;
  const postedThisWeek = weekPosts.filter((p) => p.status === 'posted').length;

  const platformBreakdown: Record<string, number> = {};
  for (const post of calendar.posts) {
    const key = post.platform;
    platformBreakdown[key] = (platformBreakdown[key] || 0) + 1;
  }

  const upcoming = getUpcomingPosts(calendar, 1);
  const nextPostTime = upcoming.length > 0
    ? new Date(upcoming[0].scheduledTime).toLocaleString()
    : 'No posts scheduled';

  return {
    scheduledThisWeek,
    postedThisWeek,
    platformBreakdown,
    nextPostTime,
  };
}

/**
 * Mark a post as posted.
 */
export function markPostCompleted(
  calendar: PostingCalendar,
  postId: string,
): PostingCalendar {
  return {
    ...calendar,
    posts: calendar.posts.map((p) =>
      p.id === postId ? { ...p, status: 'posted' as const } : p,
    ),
  };
}

/**
 * Mark a post as failed.
 */
export function markPostFailed(
  calendar: PostingCalendar,
  postId: string,
): PostingCalendar {
  return {
    ...calendar,
    posts: calendar.posts.map((p) =>
      p.id === postId ? { ...p, status: 'failed' as const } : p,
    ),
  };
}

/**
 * Remove a post from the calendar.
 */
export function removePost(
  calendar: PostingCalendar,
  postId: string,
): PostingCalendar {
  return {
    ...calendar,
    posts: calendar.posts.filter((p) => p.id !== postId),
  };
}
