import { Fragment } from "react";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface BreadcrumbItem {
  label: string;
  href?: string;
  current?: boolean;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  return (
    <nav className={cn("flex items-center space-x-2 text-sm text-slate-600 dark:text-slate-400", className)}>
      <Link href="/dashboard" className="hover:text-slate-900 dark:hover:text-slate-100">
        <Home className="h-4 w-4" />
      </Link>
      {items.map((item, index) => (
        <Fragment key={index}>
          <ChevronRight className="h-4 w-4" />
          {item.href && !item.current ? (
            <Link
              href={item.href}
              className="hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className={cn("font-medium", item.current && "text-slate-900 dark:text-slate-100")}>
              {item.label}
            </span>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
