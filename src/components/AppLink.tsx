import { Link } from "react-router-dom";
import type { ReactNode } from "react";
import { appHref } from "@/lib/domains";

/** A link to an app page (sign-in, sign-up, dashboard) that works from the marketing site too. */
export function AppLink({ to, className, children }: { to: string; className?: string; children: ReactNode }) {
  const href = appHref(to);
  if (href.startsWith("http")) {
    return <a href={href} className={className}>{children}</a>;
  }
  return <Link to={to} className={className}>{children}</Link>;
}
