'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
export default function NewContentPage() {
  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Content Management</p>
        <h1 className="text-2xl font-bold">✏️ ew ontent</h1>
        <p className="text-sm text-muted-foreground mt-1">Create a new article with AI.</p>
      </div>
      <Card><CardHeader><CardTitle className="text-sm">ew ontent</CardTitle></CardHeader><CardContent><div className="text-center py-12 text-muted-foreground"><p className="text-4xl mb-4">✏️</p><p className="text-lg font-medium mb-2">ew ontent</p><p className="text-sm">Create a new article with AI.</p></div></CardContent></Card>
    </div>
  );
}