'use client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
export default function MonetisationPage() {
  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Revenue</p>
        <h1 className="text-2xl font-bold">💰 onetisation</h1>
        <p className="text-sm text-muted-foreground mt-1">Affiliate products and ads.</p>
      </div>
      <Card><CardHeader><CardTitle className="text-sm">onetisation</CardTitle></CardHeader><CardContent><div className="text-center py-12 text-muted-foreground"><p className="text-4xl mb-4">💰</p><p className="text-lg font-medium mb-2">onetisation</p><p className="text-sm">Affiliate products and ads.</p></div></CardContent></Card>
    </div>
  );
}