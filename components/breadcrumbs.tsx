import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string; // omitted on the current/last page
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

/**
 * Simple breadcrumb trail for nested admin pages, so wayfinding doesn't
 * depend entirely on the browser back button or the header's single
 * back link. Always starts from the Dashboard.
 */
export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="border-b bg-muted/30">
      <div className="container mx-auto px-4 py-2.5">
        <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <Link href="/admin/dashboard" className="flex items-center gap-1 hover:text-primary transition-colors">
              <Home className="h-3.5 w-3.5" />
              Dashboard
            </Link>
          </li>
          {items.map((item, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50" />
              {item.href ? (
                <Link href={item.href} className="hover:text-primary transition-colors">
                  {item.label}
                </Link>
              ) : (
                <span className="font-medium text-foreground">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </div>
    </nav>
  );
}
