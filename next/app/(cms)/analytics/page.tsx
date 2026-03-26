'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
export default function AnalyticsPage() {
  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Intelligence</p>
        <h1 className="text-2xl font-bold">📈 nalytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Content performance and AI usage.</p>
      </div>
      <Card><CardHeader><CardTitle className="text-sm">nalytics</CardTitle></CardHeader><CardContent><div className="text-center py-12 text-muted-foreground"><p className="text-4xl mb-4">📈</p><p className="text-lg font-medium mb-2">nalytics</p><p className="text-sm">Content performance and AI usage.</p></div></CardContent></Card>
    </div>
  );
}