'use client';

import { useState } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

const ALL_LANGUAGES = [
  { code: 'en', name: 'English', flag: 'EN' },
  { code: 'es', name: 'Spanish', flag: 'ES' },
  { code: 'fr', name: 'French', flag: 'FR' },
  { code: 'de', name: 'German', flag: 'DE' },
  { code: 'pt', name: 'Portuguese', flag: 'PT' },
  { code: 'it', name: 'Italian', flag: 'IT' },
  { code: 'ja', name: 'Japanese', flag: 'JA' },
  { code: 'ko', name: 'Korean', flag: 'KO' },
  { code: 'zh', name: 'Chinese', flag: 'ZH' },
  { code: 'ar', name: 'Arabic', flag: 'AR' },
  { code: 'hi', name: 'Hindi', flag: 'HI' },
  { code: 'nl', name: 'Dutch', flag: 'NL' },
  { code: 'ru', name: 'Russian', flag: 'RU' },
  { code: 'sv', name: 'Swedish', flag: 'SV' },
  { code: 'tr', name: 'Turkish', flag: 'TR' },
  { code: 'pl', name: 'Polish', flag: 'PL' },
];

export default function LocalizationPage() {
  const { content, settings, setSettings, deductCredit } = useWorkspace();
  const [showPicker, setShowPicker] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<number | null>(null);
  const [targetLang, setTargetLang] = useState('');
  const [translating, setTranslating] = useState(false);

  const activeLangs = settings.activeLangs || ['en'];
  const availableLangs = ALL_LANGUAGES.filter((l) => !activeLangs.includes(l.code));

  function addLanguage(code: string) {
    setSettings({ activeLangs: [...activeLangs, code] });
    setShowPicker(false);
  }

  function removeLanguage(code: string) {
    if (code === settings.defaultLang) return;
    setSettings({ activeLangs: activeLangs.filter((l) => l !== code) });
  }

  function handleTranslate() {
    if (!selectedArticle || !targetLang) return;
    const ok = deductCredit('aiCalls');
    if (!ok) return;
    setTranslating(true);
    setTimeout(() => setTranslating(false), 2000);
  }

  // Count articles per locale
  const langCounts: Record<string, number> = {};
  for (const c of content) {
    const loc = c.locale || 'en';
    langCounts[loc] = (langCounts[loc] || 0) + 1;
  }

  const totalArticles = content.length || 1;

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Advanced</p>
        <h1 className="text-2xl font-bold">Localization</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage translations across {activeLangs.length} language{activeLangs.length !== 1 ? 's' : ''} &middot;
          Default: {ALL_LANGUAGES.find((l) => l.code === settings.defaultLang)?.name || 'English'}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Active Languages */}
        <div className="col-span-2 space-y-4">
          <Card className="bg-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Active Languages</CardTitle>
                <Button size="sm" variant="outline" onClick={() => setShowPicker(!showPicker)}>+ Add Language</Button>
              </div>
            </CardHeader>
            <CardContent>
              {showPicker && (
                <div className="mb-4 p-3 rounded-lg border border-border bg-muted/50">
                  <p className="text-xs font-medium mb-2">Select a language to add:</p>
                  <div className="flex flex-wrap gap-2">
                    {availableLangs.map((l) => (
                      <Button key={l.code} size="sm" variant="outline" onClick={() => addLanguage(l.code)} className="text-xs">
                        {l.flag} {l.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {activeLangs.map((code) => {
                  const lang = ALL_LANGUAGES.find((l) => l.code === code);
                  const count = langCounts[code] || 0;
                  const coverage = totalArticles > 0 ? Math.round((count / totalArticles) * 100) : 0;
                  return (
                    <div key={code} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                      <span className="font-mono text-xs font-bold bg-muted px-2 py-1 rounded">{lang?.flag || code.toUpperCase()}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{lang?.name || code}</span>
                          {code === settings.defaultLang && <Badge variant="default" className="text-[9px]">Default</Badge>}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Progress value={coverage} className="h-1.5 flex-1" />
                          <span className="text-[10px] text-muted-foreground">{count} articles ({coverage}%)</span>
                        </div>
                      </div>
                      {code !== settings.defaultLang && (
                        <Button size="sm" variant="ghost" onClick={() => removeLanguage(code)} className="text-muted-foreground text-xs">Remove</Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Translation Memory */}
          <Card className="bg-card">
            <CardHeader><CardTitle className="text-sm">Translation Memory</CardTitle></CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <p className="text-3xl mb-2">🧠</p>
                <p className="text-sm font-medium mb-1">Translation Memory</p>
                <p className="text-xs">Stores previously translated phrases for consistency. Builds automatically as you translate content.</p>
                <p className="text-xs mt-2 text-violet-400">0 entries stored</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Translate Article */}
        <div className="space-y-4">
          <Card className="bg-card">
            <CardHeader><CardTitle className="text-sm">Translate Article</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Source Article</label>
                <select value={selectedArticle || ''} onChange={(e) => setSelectedArticle(Number(e.target.value) || null)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs">
                  <option value="">Select an article...</option>
                  {content.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Target Language</label>
                <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs">
                  <option value="">Select language...</option>
                  {activeLangs.filter((l) => l !== settings.defaultLang).map((code) => {
                    const lang = ALL_LANGUAGES.find((l) => l.code === code);
                    return <option key={code} value={code}>{lang?.name || code}</option>;
                  })}
                </select>
              </div>
              <Button onClick={handleTranslate} className="w-full" disabled={!selectedArticle || !targetLang || translating}>
                {translating ? 'Translating...' : 'Translate with AI'}
              </Button>
              <p className="text-[10px] text-muted-foreground text-center">Uses 1 AI credit per translation</p>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardContent className="p-4">
              <p className="text-xs font-medium mb-2">Coverage Summary</p>
              <div className="space-y-1">
                {activeLangs.map((code) => {
                  const lang = ALL_LANGUAGES.find((l) => l.code === code);
                  const count = langCounts[code] || 0;
                  return (
                    <div key={code} className="flex justify-between text-[11px]">
                      <span className="text-muted-foreground">{lang?.name || code}</span>
                      <span className="font-mono">{count}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
