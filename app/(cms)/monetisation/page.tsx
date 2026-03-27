'use client';

import { useState } from 'react';
import { useWorkspace } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

interface AffiliateProduct {
  id: number;
  name: string;
  commission: string;
  url: string;
  status: 'active' | 'paused';
  clicks: number;
  revenue: number;
}

interface AdSlot {
  id: number;
  name: string;
  position: 'header' | 'sidebar' | 'in-content' | 'footer';
  provider: string;
  enabled: boolean;
  impressions: number;
  revenue: number;
}

export default function MonetisationPage() {
  const { content } = useWorkspace();

  const [products, setProducts] = useState<AffiliateProduct[]>([
    { id: 1, name: 'Ahrefs', commission: '20%', url: 'https://ahrefs.com/affiliate', status: 'active', clicks: 142, revenue: 284 },
    { id: 2, name: 'Hostinger', commission: '60%', url: 'https://hostinger.com/affiliate', status: 'active', clicks: 89, revenue: 534 },
    { id: 3, name: 'Canva Pro', commission: '$36/sale', url: 'https://canva.com/partner', status: 'paused', clicks: 23, revenue: 72 },
  ]);

  const [adSlots, setAdSlots] = useState<AdSlot[]>([
    { id: 1, name: 'Header Banner', position: 'header', provider: 'Google AdSense', enabled: true, impressions: 12400, revenue: 18.60 },
    { id: 2, name: 'Sidebar Ad', position: 'sidebar', provider: 'Ezoic', enabled: true, impressions: 8900, revenue: 13.35 },
    { id: 3, name: 'In-Content Native', position: 'in-content', provider: 'Mediavine', enabled: false, impressions: 0, revenue: 0 },
    { id: 4, name: 'Footer Banner', position: 'footer', provider: 'Google AdSense', enabled: true, impressions: 5200, revenue: 5.20 },
  ]);

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showAddSlot, setShowAddSlot] = useState(false);
  const [newProduct, setNewProduct] = useState({ name: '', commission: '', url: '' });
  const [newSlot, setNewSlot] = useState({ name: '', position: 'header' as AdSlot['position'], provider: '' });

  const totalRevenue = products.reduce((a, p) => a + p.revenue, 0) + adSlots.reduce((a, s) => a + s.revenue, 0);

  function addProduct() {
    if (!newProduct.name.trim()) return;
    setProducts([...products, { id: Date.now(), ...newProduct, status: 'active', clicks: 0, revenue: 0 }]);
    setNewProduct({ name: '', commission: '', url: '' });
    setShowAddProduct(false);
  }

  function addSlot() {
    if (!newSlot.name.trim()) return;
    setAdSlots([...adSlots, { id: Date.now(), ...newSlot, enabled: true, impressions: 0, revenue: 0 }]);
    setNewSlot({ name: '', position: 'header', provider: '' });
    setShowAddSlot(false);
  }

  function toggleProduct(id: number) {
    setProducts(products.map((p) => p.id === id ? { ...p, status: p.status === 'active' ? 'paused' : 'active' } : p));
  }

  function removeProduct(id: number) {
    setProducts(products.filter((p) => p.id !== id));
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Revenue</p>
        <h1 className="text-2xl font-bold">Monetisation</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage affiliate products and ad placements. Est. revenue: <span className="text-emerald-400 font-semibold">${totalRevenue.toFixed(2)}</span>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Card><CardContent className="p-4"><div className="text-2xl font-bold text-emerald-400">${totalRevenue.toFixed(2)}</div><div className="text-xs text-muted-foreground">Total Revenue</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">{products.filter((p) => p.status === 'active').length}</div><div className="text-xs text-muted-foreground">Active Products</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-2xl font-bold">{adSlots.filter((s) => s.enabled).length}</div><div className="text-xs text-muted-foreground">Active Ad Slots</div></CardContent></Card>
      </div>

      {/* Affiliate Products */}
      <Card className="mb-4">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm">Affiliate Products</CardTitle>
          <Button size="sm" onClick={() => setShowAddProduct(!showAddProduct)}>{showAddProduct ? 'Cancel' : 'Add Product'}</Button>
        </CardHeader>
        <CardContent>
          {showAddProduct && (
            <div className="p-3 rounded-lg bg-muted/50 mb-4 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <Input value={newProduct.name} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })} placeholder="Product name" />
                <Input value={newProduct.commission} onChange={(e) => setNewProduct({ ...newProduct, commission: e.target.value })} placeholder="e.g. 20% or $50" />
                <Input value={newProduct.url} onChange={(e) => setNewProduct({ ...newProduct, url: e.target.value })} placeholder="Affiliate URL" />
              </div>
              <Button size="sm" onClick={addProduct}>Add Product</Button>
            </div>
          )}
          <div className="grid grid-cols-3 gap-3">
            {products.map((p) => (
              <Card key={p.id} className="bg-muted/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold text-sm">{p.name}</span>
                    <Badge variant={p.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">{p.status}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mb-1">Commission: {p.commission}</div>
                  <div className="text-xs text-muted-foreground mb-2">Clicks: {p.clicks} | Revenue: ${p.revenue}</div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => toggleProduct(p.id)}>
                      {p.status === 'active' ? 'Pause' : 'Activate'}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-6 text-xs text-red-400" onClick={() => removeProduct(p.id)}>Remove</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Ad Placements */}
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm">Ad Placements</CardTitle>
          <Button size="sm" onClick={() => setShowAddSlot(!showAddSlot)}>{showAddSlot ? 'Cancel' : 'Add Ad Slot'}</Button>
        </CardHeader>
        <CardContent>
          {showAddSlot && (
            <div className="p-3 rounded-lg bg-muted/50 mb-4 space-y-2">
              <div className="grid grid-cols-3 gap-2">
                <Input value={newSlot.name} onChange={(e) => setNewSlot({ ...newSlot, name: e.target.value })} placeholder="Slot name" />
                <select className="bg-background border rounded-md px-3 py-1.5 text-sm" value={newSlot.position} onChange={(e) => setNewSlot({ ...newSlot, position: e.target.value as AdSlot['position'] })}>
                  <option value="header">Header</option>
                  <option value="sidebar">Sidebar</option>
                  <option value="in-content">In-Content</option>
                  <option value="footer">Footer</option>
                </select>
                <Input value={newSlot.provider} onChange={(e) => setNewSlot({ ...newSlot, provider: e.target.value })} placeholder="Ad provider" />
              </div>
              <Button size="sm" onClick={addSlot}>Add Slot</Button>
            </div>
          )}
          <div className="space-y-2">
            {adSlots.map((s) => (
              <div key={s.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-[10px] w-20 justify-center">{s.position}</Badge>
                  <div>
                    <div className="text-sm font-medium">{s.name}</div>
                    <div className="text-xs text-muted-foreground">{s.provider}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span>{s.impressions.toLocaleString()} imp</span>
                  <span className="text-emerald-400">${s.revenue.toFixed(2)}</span>
                  <Badge variant={s.enabled ? 'default' : 'secondary'} className="text-[10px]">{s.enabled ? 'Active' : 'Disabled'}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
