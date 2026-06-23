import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, Users, UserRound, Loader2 } from 'lucide-react';
import { entities } from '@/lib/api';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';

const roleLabels = {
  admin: 'Administrator',
  inspector: 'Inspector',
  auditor: 'Auditor',
  shipper: 'Shipper',
  user: 'User',
};

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => entities.User.list('full_name', 200),
  });
  const updateRole = useMutation({
    mutationFn: ({ id, role }) => entities.User.update(id, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-users'] }),
  });

  const roleCounts = users.reduce((counts, user) => ({
    ...counts,
    [user.role]: (counts[user.role] || 0) + 1,
  }), {});

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">Administrasi akses</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">Manajemen User</h1>
          <p className="mt-1 text-sm text-muted-foreground">Tinjau peran dan akses pengguna aplikasi.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4 text-primary" />
          <span className="data-value font-semibold text-foreground">{users.length}</span> pengguna
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-24 rounded-xl" />)}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(roleLabels).filter(([role]) => roleCounts[role]).map(([role, label]) => (
            <Card key={role} className="p-4">
              <p className="text-xs font-medium text-muted-foreground">{label}</p>
              <p className="data-value mt-2 text-2xl font-bold tracking-tight">{roleCounts[role]}</p>
            </Card>
          ))}
        </div>
      )}

      <Card className="overflow-hidden">
        <div className="border-b border-border/80 px-5 py-4">
          <h2 className="font-semibold">Daftar pengguna</h2>
        </div>
        {error ? (
          <p className="p-5 text-sm text-destructive">Daftar pengguna tidak dapat dimuat. Muat ulang halaman untuk mencoba lagi.</p>
        ) : isLoading ? (
          <div className="space-y-3 p-5">{[1, 2, 3, 4].map((item) => <Skeleton key={item} className="h-14 rounded-lg" />)}</div>
        ) : (
          <div className="divide-y divide-border/70">
            {users.map((user) => {
              const isCurrentUser = user.id === currentUser?.id;
              const isUpdating = updateRole.isPending && updateRole.variables?.id === user.id;
              return (
                <div key={user.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/5 text-primary">
                      {user.role === 'admin' ? <ShieldCheck className="h-4 w-4" /> : <UserRound className="h-4 w-4" />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{user.full_name || user.name || user.email}</p>
                      <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 sm:w-44">
                    {isUpdating && <Loader2 className="h-4 w-4 animate-spin text-primary" aria-label="Memperbarui peran" />}
                    <Select
                      value={user.role || 'user'}
                      onValueChange={(role) => updateRole.mutate({ id: user.id, role })}
                      disabled={isCurrentUser || isUpdating}
                    >
                      <SelectTrigger aria-label={`Peran ${user.email}`} className="h-9 w-full"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(roleLabels).map(([role, label]) => <SelectItem key={role} value={role}>{label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
      <p className="text-xs text-muted-foreground">Peran akun yang sedang digunakan tidak dapat diubah dari halaman ini.</p>
    </div>
  );
}
