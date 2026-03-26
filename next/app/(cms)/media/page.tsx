'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
export default function MediaLibraryPage() {
  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Content Management</p>
        <h1 className="text-2xl font-bold">🖼 edia ibrary</h1>
        <p className="text-sm text-muted-foreground mt-1">Upload and manage media assets.</p>
      </div>
      <Card><CardHeader><CardTitle className="text-sm">edia ibrary</CardTitle></CardHeader><CardContent><div className="text-center py-12 text-muted-foreground"><p className="text-4xl mb-4">🖼</p><p className="text-lg font-medium mb-2">edia ibrary</p><p className="text-sm">Upload and manage media assets.</p></div></CardContent></Card>
    </div>
  );
}