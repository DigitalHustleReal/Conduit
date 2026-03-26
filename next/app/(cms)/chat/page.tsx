'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
export default function AIChatPage() {
  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Intelligence</p>
        <h1 className="text-2xl font-bold">💬 hat</h1>
        <p className="text-sm text-muted-foreground mt-1">AI assistant with workspace context.</p>
      </div>
      <Card><CardHeader><CardTitle className="text-sm">hat</CardTitle></CardHeader><CardContent><div className="text-center py-12 text-muted-foreground"><p className="text-4xl mb-4">💬</p><p className="text-lg font-medium mb-2">hat</p><p className="text-sm">AI assistant with workspace context.</p></div></CardContent></Card>
    </div>
  );
}