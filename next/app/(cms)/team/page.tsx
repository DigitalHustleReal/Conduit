'use client';

import { useState } from 'react';
import { useWorkspace, PLAN_LIMITS } from '@/stores/workspace';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';

const ROLE_DESC: Record<string, string> = {
  Admin: 'Full access. Manage billing, team, settings, and all content.',
  Editor: 'Create, edit, and publish content. Manage collections and keywords.',
  Writer: 'Create and edit own content. Submit for review.',
  Viewer: 'Read-only access to all content and analytics.',
};

export default function TeamPage() {
  const { team, pricingPlan, credits } = useWorkspace();
  const limits = PLAN_LIMITS[pricingPlan] || PLAN_LIMITS.free;

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'Admin' | 'Editor' | 'Writer' | 'Viewer'>('Writer');
  const [editingId, setEditingId] = useState<number | null>(null);

  const setTeam = (newTeam: typeof team) => {
    useWorkspace.setState({ team: newTeam });
  };

  function handleInvite() {
    if (!inviteEmail.trim()) return;
    const newMember = {
      id: Date.now(),
      name: inviteEmail.split('@')[0],
      email: inviteEmail,
      role: inviteRole,
      status: 'invited' as const,
    };
    setTeam([...team, newMember]);
    setInviteEmail('');
    setShowInvite(false);
  }

  function handleRemove(id: number) {
    if (confirm('Remove this team member?')) {
      setTeam(team.filter((m) => m.id !== id));
    }
  }

  function handleRoleChange(id: number, role: 'Admin' | 'Editor' | 'Writer' | 'Viewer') {
    setTeam(team.map((m) => m.id === id ? { ...m, role } : m));
    setEditingId(null);
  }

  return (
    <div>
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest text-muted-foreground font-mono mb-1">Workspace</p>
        <h1 className="text-2xl font-bold">Team Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {team.length} of {limits.seats} seats used
          <Badge variant="outline" className="ml-2 capitalize">{pricingPlan} plan</Badge>
        </p>
      </div>

      {/* Members Table */}
      <Card className="mb-4">
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="text-sm">Team Members</CardTitle>
          <Button size="sm" onClick={() => setShowInvite(!showInvite)} disabled={team.length >= limits.seats}>
            {showInvite ? 'Cancel' : 'Invite Member'}
          </Button>
        </CardHeader>
        <CardContent>
          {showInvite && (
            <div className="flex items-end gap-3 mb-4 p-3 rounded-lg bg-muted/50">
              <div className="flex-1">
                <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="colleague@example.com" />
              </div>
              <div className="w-32">
                <label className="text-xs text-muted-foreground mb-1 block">Role</label>
                <select className="w-full bg-background border rounded-md px-3 py-1.5 text-sm" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as typeof inviteRole)}>
                  <option value="Admin">Admin</option>
                  <option value="Editor">Editor</option>
                  <option value="Writer">Writer</option>
                  <option value="Viewer">Viewer</option>
                </select>
              </div>
              <Button size="sm" onClick={handleInvite}>Send Invite</Button>
            </div>
          )}

          <div className="space-y-2">
            {team.map((m) => (
              <div key={m.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-sm font-bold">
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{m.name}</div>
                    <div className="text-xs text-muted-foreground">{m.email || 'No email'}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={m.status === 'active' ? 'default' : 'secondary'} className="text-[10px]">{m.status}</Badge>
                  {editingId === m.id ? (
                    <select className="bg-background border rounded-md px-2 py-1 text-xs" value={m.role} onChange={(e) => handleRoleChange(m.id, e.target.value as typeof m.role)}>
                      <option value="Admin">Admin</option>
                      <option value="Editor">Editor</option>
                      <option value="Writer">Writer</option>
                      <option value="Viewer">Viewer</option>
                    </select>
                  ) : (
                    <Badge variant="outline" className="text-[10px] cursor-pointer" onClick={() => setEditingId(m.id)}>{m.role}</Badge>
                  )}
                  {m.id !== 1 && <Button size="sm" variant="ghost" className="text-red-400 h-7 px-2" onClick={() => handleRemove(m.id)}>Remove</Button>}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Role Descriptions */}
      <Card>
        <CardHeader><CardTitle className="text-sm">Role Permissions</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {Object.entries(ROLE_DESC).map(([role, desc]) => (
              <div key={role} className="p-3 rounded-lg bg-muted/30">
                <div className="text-sm font-semibold mb-1">{role}</div>
                <div className="text-xs text-muted-foreground">{desc}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
