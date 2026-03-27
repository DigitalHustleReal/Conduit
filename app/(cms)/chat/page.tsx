'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { callAI } from '@/lib/ai/call-ai';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  ts: number;
}

const SYSTEM_MSG: ChatMessage = {
  role: 'system',
  content: "I'm your AI content assistant. Ask me about SEO, keywords, content strategy, or anything about your workspace. I have full context of your content, keywords, and settings.",
  ts: Date.now(),
};

const QUICK_PROMPTS = [
  'Suggest 5 article ideas for my niche',
  'Analyze my content strategy',
  'How can I improve my SEO scores?',
  'Create a content calendar for this week',
];

export default function AIChatPage() {
  const { content, keywords, settings, credits, deductCredit } = useWorkspace();
  const [messages, setMessages] = useState<ChatMessage[]>([SYSTEM_MSG]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text?: string) => {
    const msg = text || input.trim();
    if (!msg) return;

    const userMsg: ChatMessage = { role: 'user', content: msg, ts: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const ok = deductCredit('aiCalls');
    if (!ok) {
      const limitMsg: ChatMessage = {
        role: 'assistant',
        content: 'You have reached your credit limit. Please upgrade your plan or add a BYOK API key in Settings to continue.',
        ts: Date.now(),
      };
      setMessages((prev) => [...prev, limitMsg]);
      setIsTyping(false);
      toast.error('Credit limit reached');
      return;
    }

    // Build workspace context for the system prompt
    const workspaceContext = [
      `User's workspace has ${content.length} articles and ${keywords.length} keywords.`,
      settings.niche ? `Niche: ${settings.niche}` : '',
      settings.siteDomain ? `Domain: ${settings.siteDomain}` : '',
      content.length > 0 ? `Recent articles: ${content.slice(0, 5).map((c) => c.title).join(', ')}` : '',
      keywords.length > 0 ? `Top keywords: ${keywords.slice(0, 10).map((k) => k.keyword || k.term).join(', ')}` : '',
    ].filter(Boolean).join('\n');

    const systemPrompt = `You are an expert AI content operations assistant for a content management platform called Conduit. You help with SEO, content strategy, keyword research, and content optimization.\n\nWorkspace context:\n${workspaceContext}\n\nBe specific, actionable, and reference the user's actual data when relevant.`;

    // Build conversation history (excluding the system display message) for multi-turn
    const prevMessages = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

    // Add a placeholder assistant message that we'll stream into
    const placeholderId = Date.now();
    setMessages((prev) => [...prev, { role: 'assistant', content: '', ts: placeholderId }]);

    try {
      const result = await callAI(
        msg,
        {
          provider: settings.aiProvider,
          model: settings.aiModel,
          messages: prevMessages,
          system: systemPrompt,
          stream: true,
          onChunk: (chunk) => {
            setMessages((prev) =>
              prev.map((m) =>
                m.ts === placeholderId ? { ...m, content: m.content + chunk } : m
              )
            );
          },
        },
        settings as unknown as Record<string, string>,
      );

      // If streaming didn't work (non-streaming fallback), set the full result
      setMessages((prev) =>
        prev.map((m) =>
          m.ts === placeholderId && !m.content ? { ...m, content: result } : m
        )
      );
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : 'Unknown error occurred';
      setMessages((prev) =>
        prev.map((m) =>
          m.ts === placeholderId ? { ...m, content: `Error: ${errMsg}` } : m
        )
      );
      toast.error(errMsg);
    } finally {
      setIsTyping(false);
    }
  }, [input, messages, content, keywords, settings, deductCredit]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Intelligence</p>
        <h1 className="text-2xl font-bold">AI Chat</h1>
      </div>

      {/* Context bar */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Badge variant="outline" className="text-xs">{content.length} articles</Badge>
        <Badge variant="outline" className="text-xs">{keywords.length} keywords</Badge>
        <Badge variant="outline" className="text-xs">Provider: {settings.aiProvider}</Badge>
        <Badge variant="outline" className="text-xs">Credits: {credits.aiCalls}</Badge>
      </div>

      {/* Messages */}
      <Card className="flex-1 overflow-hidden">
        <CardContent className="p-4 h-full overflow-y-auto space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                m.role === 'user'
                  ? 'bg-primary text-primary-foreground'
                  : m.role === 'system'
                    ? 'bg-muted/50 text-muted-foreground border border-border italic'
                    : 'bg-muted text-foreground'
              }`}>
                {m.content || (isTyping && m === messages[messages.length - 1] ? '' : m.content)}
              </div>
            </div>
          ))}
          {isTyping && messages[messages.length - 1]?.role === 'assistant' && !messages[messages.length - 1]?.content && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg px-3 py-2 text-sm text-muted-foreground animate-pulse">Thinking...</div>
            </div>
          )}
          <div ref={bottomRef} />
        </CardContent>
      </Card>

      {/* Quick prompts */}
      {messages.length <= 2 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {QUICK_PROMPTS.map((p) => (
            <Button key={p} variant="outline" size="sm" className="text-xs" onClick={() => sendMessage(p)}>{p}</Button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 mt-3">
        <Input
          placeholder="Ask about your content, SEO, keywords..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1"
        />
        <Button onClick={() => sendMessage()} disabled={!input.trim() || isTyping}>Send</Button>
      </div>
    </div>
  );
}
