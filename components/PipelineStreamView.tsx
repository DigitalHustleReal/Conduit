'use client';

import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { pipelineStream, type PipelineEvent, type PipelineStage } from '@/lib/pipeline/stream';
import { useWorkspace } from '@/stores/workspace';

// ---------------------------------------------------------------------------
// Stage styling
// ---------------------------------------------------------------------------

const STAGE_COLORS: Record<PipelineStage, string> = {
  idle: 'bg-muted text-muted-foreground border-border',
  discovering: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  expanding: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  scoring: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  planning: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  briefing: 'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  writing: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  editing: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  'fact-checking': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
  'quality-gates': 'bg-rose-500/15 text-rose-400 border-rose-500/30',
  publishing: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  distributing: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  complete: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  error: 'bg-rose-500/15 text-rose-400 border-rose-500/30',
};

const ACTIVE_STAGES = new Set<PipelineStage>([
  'discovering', 'expanding', 'scoring', 'planning', 'briefing',
  'writing', 'editing', 'fact-checking', 'quality-gates', 'publishing', 'distributing',
]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface PipelineStreamViewProps {
  /** Max events to display. Defaults to 50. */
  maxEvents?: number;
  /** Max height CSS class. Defaults to max-h-[400px]. */
  heightClass?: string;
  /** Show compact view (fewer details). */
  compact?: boolean;
}

export function PipelineStreamView({
  maxEvents = 50,
  heightClass = 'max-h-[400px]',
  compact = false,
}: PipelineStreamViewProps) {
  const [events, setEvents] = useState<PipelineEvent[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const addPipelineEvent = useWorkspace((s) => s.addPipelineEvent);

  // Subscribe to the global pipeline stream
  useEffect(() => {
    // Load existing history
    const history = pipelineStream.getHistory();
    setEvents(history.slice(-maxEvents));

    const unsub = pipelineStream.subscribe((event) => {
      setEvents((prev) => {
        const next = [...prev, event];
        return next.slice(-maxEvents);
      });
      // Also persist to Zustand store
      addPipelineEvent(event);
    });

    return unsub;
  }, [maxEvents, addPipelineEvent]);

  // Auto-scroll to bottom on new events
  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  }, [events]);

  // Determine if pipeline is currently active
  const lastEvent = events[events.length - 1];
  const isActive = lastEvent ? ACTIVE_STAGES.has(lastEvent.stage) : false;

  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-muted flex items-center justify-center">
          <span className="text-lg text-muted-foreground/50">{'\u25B6'}</span>
        </div>
        <p className="text-sm text-muted-foreground">No pipeline activity yet</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Events appear here when the autopilot runs
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Active indicator */}
      {isActive && (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-400" />
          </span>
          <span className="text-xs text-blue-400 font-medium">Pipeline running...</span>
          {lastEvent?.progress && (
            <span className="text-xs text-blue-400/70 font-mono ml-auto">
              {lastEvent.progress.current}/{lastEvent.progress.total}
            </span>
          )}
        </div>
      )}

      {/* Progress bar */}
      {lastEvent?.progress && isActive && (
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-500"
            style={{
              width: `${Math.round((lastEvent.progress.current / lastEvent.progress.total) * 100)}%`,
            }}
          />
        </div>
      )}

      {/* Event log */}
      <div
        ref={scrollRef}
        className={cn('overflow-y-auto space-y-0.5', heightClass)}
      >
        {events.map((event) => (
          <div
            key={event.id}
            className={cn(
              'flex items-start gap-2 rounded-lg transition-colors',
              compact ? 'px-2 py-1.5' : 'px-3 py-2 hover:bg-muted/50',
            )}
          >
            {/* Stage badge */}
            <Badge
              variant="outline"
              className={cn(
                'text-[9px] shrink-0 mt-0.5 font-mono',
                STAGE_COLORS[event.stage] || STAGE_COLORS.idle,
              )}
            >
              {event.stage}
            </Badge>

            {/* Message */}
            <div className="flex-1 min-w-0">
              <p className={cn(
                'text-foreground leading-snug',
                compact ? 'text-xs' : 'text-sm',
              )}>
                {event.message}
              </p>
              {/* Inline progress */}
              {event.progress && (
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden max-w-[120px]">
                    <div
                      className="h-full bg-blue-400 transition-all duration-300"
                      style={{
                        width: `${Math.round((event.progress.current / event.progress.total) * 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground/50 font-mono">
                    {event.progress.current}/{event.progress.total}
                  </span>
                </div>
              )}
            </div>

            {/* Timestamp + cost */}
            <div className="flex items-center gap-2 shrink-0">
              {event.creditCost !== undefined && event.creditCost > 0 && (
                <span className="text-[10px] text-amber-400/70 font-mono">
                  {event.creditCost}cr
                </span>
              )}
              <span className="text-[10px] text-muted-foreground/40 font-mono whitespace-nowrap">
                {formatTime(event.timestamp)}
              </span>
            </div>
          </div>
        ))}

        {/* Typing indicator when active */}
        {isActive && (
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="flex gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs text-muted-foreground/50">Processing...</span>
          </div>
        )}
      </div>
    </div>
  );
}

export default PipelineStreamView;
