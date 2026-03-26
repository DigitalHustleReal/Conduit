'use client';

import { useState, useMemo, useRef } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

export default function MediaLibraryPage() {
  const { media, setMedia, settings, setSettings } = useWorkspace();
  const [search, setSearch] = useState('');
  const view = settings.mediaView || 'grid';
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    if (!search) return media;
    const q = search.toLowerCase();
    return media.filter((m) => m.name.toLowerCase().includes(q) || (m.alt || '').toLowerCase().includes(q));
  }, [media, search]);

  function toggleView() {
    setSettings({ mediaView: view === 'grid' ? 'list' : 'grid' });
  }

  function handleDelete(id: number) {
    setMedia(media.filter((m) => m.id !== id));
  }

  function handleFiles(files: FileList | null) {
    if (!files) return;
    const newItems = Array.from(files).map((f) => ({
      id: Date.now() + Math.random(),
      name: f.name,
      url: URL.createObjectURL(f),
      type: f.type,
      size: f.size,
      source: 'upload' as const,
      created: Date.now(),
    }));
    setMedia([...media, ...newItems]);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Content Management</p>
          <h1 className="text-2xl font-bold">Media Library</h1>
          <p className="text-sm text-muted-foreground mt-1">Upload and manage media assets.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={toggleView}>{view === 'grid' ? 'List View' : 'Grid View'}</Button>
          <Button onClick={() => fileRef.current?.click()}>Upload</Button>
          <input ref={fileRef} type="file" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
        </div>
      </div>

      <div
        className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-8 mb-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
        onDragOver={(e) => e.preventDefault()} onDrop={handleDrop} onClick={() => fileRef.current?.click()}
      >
        <p className="text-muted-foreground text-sm">Drop files here or click to upload</p>
      </div>

      <div className="mb-4">
        <Input placeholder="Search media..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent>
            <div className="text-center py-12 text-muted-foreground">
              <p className="text-lg font-medium mb-2">Your media library is empty</p>
              <p className="text-sm">Upload images, documents, or other files to get started.</p>
            </div>
          </CardContent>
        </Card>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <div className="aspect-square bg-muted flex items-center justify-center">
                {item.type?.startsWith('image/') ? (
                  <img src={item.url} alt={item.alt || item.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl text-muted-foreground">📄</span>
                )}
              </div>
              <CardContent className="p-2">
                <p className="text-xs font-medium truncate">{item.name}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">{formatBytes(item.size || 0)}</span>
                  <Button variant="destructive" size="xs" onClick={() => handleDelete(item.id)}>Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 pr-4">Name</th>
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4">Size</th>
                  <th className="pb-2 pr-4">Date</th>
                  <th className="pb-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="py-2 pr-4 font-medium">{item.name}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{item.type || 'unknown'}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{formatBytes(item.size || 0)}</td>
                    <td className="py-2 pr-4 text-muted-foreground">{new Date(item.created).toLocaleDateString()}</td>
                    <td className="py-2"><Button variant="destructive" size="xs" onClick={() => handleDelete(item.id)}>Delete</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
