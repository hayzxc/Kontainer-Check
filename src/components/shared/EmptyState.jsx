import React from 'react';
import { Card } from '@/components/ui/card';

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}) {
  return (
    <Card className="surface-panel border-dashed p-8 text-center">
      {Icon && (
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/8 text-primary">
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
      )}
      {title && <h3 className="text-base font-semibold">{title}</h3>}
      {description && (
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </Card>
  );
}
