import React from 'react';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, AlertTriangle, FileEdit } from 'lucide-react';
import { cn } from '@/lib/utils';

/* Doc 10 - exact status colors: approved=#27AE60 rejected=#E74C3C pending=#F39C12 */
const statusConfig = {
  draft: { label: 'Draft', icon: FileEdit, className: 'bg-slate-100 text-slate-600 border-slate-200' },
  pending: { label: 'Pending', icon: Clock, className: 'bg-[#FEF9EC] text-[#B7770D] border-[#F39C12]/40' },
  approved: { label: 'Disetujui', icon: CheckCircle2, className: 'bg-[#EAFAF1] text-[#1E8449] border-[#27AE60]/40' },
  rejected: { label: 'Ditolak', icon: XCircle, className: 'bg-[#FDEDEC] text-[#C0392B] border-[#E74C3C]/40' },
  clarification: { label: 'Klarifikasi', icon: AlertTriangle, className: 'bg-[#FEF5E7] text-[#B9770E] border-[#F0A500]/40' },
};

export default function StatusBadge({ status, size = 'default' }) {
  const config = statusConfig[status] || statusConfig.draft;
  const Icon = config.icon;

  return (
    <Badge 
      variant="outline" 
      className={cn(
        'gap-1 font-medium border',
        config.className,
        size === 'sm' && 'text-[10px] px-1.5 py-0.5',
        size === 'lg' && 'text-sm px-3 py-1'
      )}
    >
      <Icon className={cn("w-3 h-3", size === 'lg' && "w-4 h-4")} />
      {config.label}
    </Badge>
  );
}
