"use client";

import type { ReactNode } from "react";

export function ReadingLayout({ title, description, children, actions, narrow = false, immersive = false, scene = "reading" }: {
  title?: string; description?: ReactNode; step?: number; children: ReactNode; actions?: ReactNode; narrow?: boolean; immersive?: boolean;
  scene?: "reading" | "question" | "spreads" | "draw" | "result" | "history" | "account";
}) {
  return <main id="main-content" tabIndex={-1} className={`page-shell ${narrow ? "page-narrow" : ""} ${immersive ? "preparation-shell" : `room-page room-${scene}`}`}>
    {!immersive ? <div className="room-backdrop" aria-hidden="true" /> : null}
    <div className="content-wrap">
      {title ? <header className="page-heading"><div><h1>{title}</h1>{description ? <div className="page-description">{description}</div> : null}</div>{actions ? <div className="heading-actions">{actions}</div> : null}</header> : null}
      {children}
    </div>
  </main>;
}
