import React from "react";

export default function AuthLayout({ icon: Icon, title, subtitle, footer, children }) {
  return (
    <div className="relative min-h-dvh overflow-hidden bg-background px-4 py-8">
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(210_56%_24%_/_0.10),transparent_30%),radial-gradient(circle_at_90%_10%,hsl(34_84%_48%_/_0.10),transparent_24%)]"
        aria-hidden="true"
      />
      <div className="relative mx-auto flex min-h-[calc(100dvh-4rem)] w-full max-w-6xl items-center justify-center">
        <div className="grid w-full gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="hidden flex-col justify-between rounded-[2rem] border border-border/60 bg-[linear-gradient(180deg,hsl(215_36%_13%_/_0.98),hsl(215_34%_10%_/_0.98))] p-8 text-white shadow-[0_28px_70px_hsl(215_36%_10%_/_0.20)] lg:flex">
            <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/70">
              KontainerCheck
            </div>
            <div className="max-w-sm">
              <p className="mb-3 text-sm uppercase tracking-[0.16em] text-white/55">Inspection workflow</p>
              <h2 className="text-4xl font-semibold tracking-tight text-white">
                A focused workspace for container verification.
              </h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-white/68">
                Review photos, capture container details, and move inspections through approval without losing the audit trail.
              </p>
            </div>
            <div className="grid gap-3 text-sm text-white/72">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Draft, upload, submit, and verify in one tracked flow.
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Clear status changes and visible review states.
              </div>
            </div>
          </div>

          <div className="w-full max-w-md justify-self-center">
            <div className="mb-8 text-center">
              <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary shadow-[0_16px_30px_hsl(210_56%_24%_/_0.18)]">
                <Icon className="h-7 w-7 text-primary-foreground" aria-hidden="true" />
              </div>
              <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
              {subtitle && <p className="mt-2 leading-6 text-muted-foreground">{subtitle}</p>}
            </div>
            <div className="surface-panel rounded-[1.5rem] p-8">
              {children}
            </div>
            {footer && (
              <p className="mt-6 text-center text-sm text-muted-foreground">{footer}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
