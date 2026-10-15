import type { ReactNode } from "react";

export function PageNotice({ title, description, action, error = false, loading = false }: {
  title: string; description?: string; action?: ReactNode; error?: boolean; loading?: boolean;
}) {
  return <section className={`page-notice ${error ? "is-error" : ""}`} role={error ? "alert" : "status"} aria-busy={loading || undefined}>
    {loading ? <span className="loading-line" aria-hidden="true" /> : null}
    <h2>{title}</h2>{description ? <p>{description}</p> : null}{action ? <div className="notice-action">{action}</div> : null}
  </section>;
}
