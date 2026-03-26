'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
export default function InfographicsPage() {
  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Visual Studio</p>
        <h1 className="text-2xl font-bold">📊 nfographics</h1>
        <p className="text-sm text-muted-foreground mt-1">Data-driven infographics.</p>
      </div>
      <Card><CardHeader><CardTitle className="text-sm">nfographics</CardTitle></CardHeader><CardContent><div className="text-center py-12 text-muted-foreground"><p className="text-4xl mb-4">📊</p><p className="text-lg font-medium mb-2">nfographics</p><p className="text-sm">Data-driven infographics.</p></div></CardContent></Card>
    </div>
  );
}