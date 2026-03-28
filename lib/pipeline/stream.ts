/**
 * Pipeline Event Stream -- emits real-time progress events.
 * Components can subscribe to see what the pipeline is doing RIGHT NOW.
 *
 * Used by: Dashboard, Pipeline Builder, Autopilot page
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PipelineStage =
  | 'idle'
  | 'discovering' | 'expanding' | 'scoring'
  | 'planning' | 'briefing'
  | 'writing' | 'editing' | 'fact-checking'
  | 'quality-gates' | 'publishing' | 'distributing'
  | 'complete' | 'error';

export interface PipelineEvent {
  id: string;
  stage: PipelineStage;
  message: string;
  data?: Record<string, unknown>;
  progress?: { current: number; total: number };
  timestamp: number;
  creditCost?: number;
}

export type PipelineListener = (event: PipelineEvent) => void;

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

let idCounter = 0;

function generateId(): string {
  idCounter += 1;
  return `pe-${Date.now()}-${idCounter}`;
}

export function createPipelineStream() {
  const listeners = new Set<PipelineListener>();
  let history: PipelineEvent[] = [];
  const MAX_HISTORY = 200;

  function emit(partial: Omit<PipelineEvent, 'id' | 'timestamp'>): void {
    const event: PipelineEvent = {
      ...partial,
      id: generateId(),
      timestamp: Date.now(),
    };
    history.push(event);
    if (history.length > MAX_HISTORY) {
      history = history.slice(-MAX_HISTORY);
    }
    for (const listener of listeners) {
      try {
        listener(event);
      } catch {
        // Don't let a bad listener break the stream
      }
    }
  }

  function subscribe(listener: PipelineListener): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }

  function getHistory(): PipelineEvent[] {
    return [...history];
  }

  function clear(): void {
    history = [];
  }

  return { emit, subscribe, getHistory, clear };
}

// ---------------------------------------------------------------------------
// Global singleton
// ---------------------------------------------------------------------------

export const pipelineStream = createPipelineStream();
