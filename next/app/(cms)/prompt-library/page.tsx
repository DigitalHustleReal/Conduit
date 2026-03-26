'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
export default function PromptLibraryPage() {
  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Intelligence</p>
        <h1 className="text-2xl font-bold">⚡ rompt ibrary</h1>
        <p className="text-sm text-muted-foreground mt-1">45+ built-in prompts.</p>
      </div>
      <Card><CardHeader><CardTitle className="text-sm">rompt ibrary</CardTitle></CardHeader><CardContent><div className="text-center py-12 text-muted-foreground"><p className="text-4xl mb-4">⚡</p><p className="text-lg font-medium mb-2">rompt ibrary</p><p className="text-sm">45+ built-in prompts.</p></div></CardContent></Card>
    </div>
  );
}