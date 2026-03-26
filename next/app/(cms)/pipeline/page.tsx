'use client';

import { useState } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { PipelineItem } from '@/types/content';

const STAGES = ['backlog', 'writing', 'review', 'published'] as const;
const STAGE_LABELS: Record<string, string> = { backlog: 'Backlog', writing: 'Writing', review: 'Review', published: 'Published' };
const PRIORITY_VARIANT: Record<string, 'default' | 'secondary' | 'destructive'> = { high: 'destructive', medium: 'default', low: 'secondary' };

export default function PipelinePage() {
  const { pipeline, setPipeline } = useWorkspace();
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newKeyword, setNewKeyword] = useState('');

  function stageItems(stage: string) {
    return pipeline.filter((p) => p.stage === stage);
  }

  function handleAdd(stage: typeof STAGES[number]) {
    if (!newTitle.trim()) return;
    const item: PipelineItem = {
      id: Date.now(), title: newTitle.trim(), stage, priority: newPriority,
      keyword: newKeyword || undefined, updated: Date.now(),
    };
    setPipeline([...pipeline, item]);
    setNewTitle(''); setNewKeyword(''); setNewPriority('medium'); setAddingTo(null);
  }

  function moveItem(id: number, direction: 'forward' | 'back') {
    setPipeline(pipeline.map((p) => {
      if (p.id !== id) return p;
      const idx = STAGES.indexOf(p.stage);
      const newIdx = direction === 'forward' ? Math.min(idx + 1, 3) : Math.max(idx - 1, 0);
      return { ...p, stage: STAGES[newIdx], updated: Date.now() };
    }));
  }

  function removeItem(id: number) {
    setPipeline(pipeline.filter((p) => p.id !== id));
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Workflow</p>
        <h1 className="text-2xl font-bold">Pipeline</h1>
        <p className="text-sm text-muted-foreground mt-1">Visual content pipeline. Move tasks through stages.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAGES.map((stage) => {
          const items = stageItems(stage);
          return (
            <div key={stage} className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold">{STAGE_LABELS[stage]} <span className="text-muted-foreground font-normal">({items.length})</span></h2>
                <Button variant="ghost" size="xs" onClick={() => setAddingTo(addingTo === stage ? null : stage)}>+</Button>
              </div>

              {addingTo === stage && (
                <Card size="sm">
                  <CardContent className="space-y-2 pt-3">
                    <Input placeholder="Task title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} />
                    <Input placeholder="Keyword (optional)" value={newKeyword} onChange={(e) => setNewKeyword(e.target.value)} />
                    <select className="h-7 w-full rounded-lg border border-input bg-transparent px-2 text-xs" value={newPriority} onChange={(e) => setNewPriority(e.target.value as 'low' | 'medium' | 'high')}>
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleAdd(stage)}>Add</Button>
                      <Button size="sm" variant="ghost" onClick={() => setAddingTo(null)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-2 min-h-[100px]">
                {items.length === 0 && (
                  <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-lg">
                    No tasks in {STAGE_LABELS[stage].toLowerCase()}
                  </div>
                )}
                {items.map((item) => (
                  <Card key={item.id} size="sm" className="hover:ring-1 hover:ring-primary/20 transition-all">
                    <CardContent className="p-3">
                      <p className="text-sm font-medium mb-1">{item.title}</p>
                      <div className="flex flex-wrap gap-1 mb-2">
                        {item.priority && <Badge variant={PRIORITY_VARIANT[item.priority] || 'secondary'} className="text-[10px]">{item.priority}</Badge>}
                        {item.keyword && <Badge variant="outline" className="text-[10px]">{item.keyword}</Badge>}
                      </div>
                      {item.assignee && <p className="text-[10px] text-muted-foreground mb-1">Assigned: {item.assignee}</p>}
                      <div className="flex gap-1 mt-1">
                        {STAGES.indexOf(stage) > 0 && (
                          <Button variant="ghost" size="xs" onClick={() => moveItem(item.id, 'back')}>← Back</Button>
                        )}
                        {STAGES.indexOf(stage) < 3 && (
                          <Button variant="ghost" size="xs" onClick={() => moveItem(item.id, 'forward')}>Next →</Button>
                        )}
                        <Button variant="ghost" size="xs" className="ml-auto text-destructive" onClick={() => removeItem(item.id)}>Remove</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
