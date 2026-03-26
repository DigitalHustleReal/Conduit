'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
export default function ContentLinksPage() {
  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">SEO</p>
        <h1 className="text-2xl font-bold">🔗 ontent inks</h1>
        <p className="text-sm text-muted-foreground mt-1">Internal link network.</p>
      </div>
      <Card><CardHeader><CardTitle className="text-sm">ontent inks</CardTitle></CardHeader><CardContent><div className="text-center py-12 text-muted-foreground"><p className="text-4xl mb-4">🔗</p><p className="text-lg font-medium mb-2">ontent inks</p><p className="text-sm">Internal link network.</p></div></CardContent></Card>
    </div>
  );
}