"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type SidebarItem = {
  label: string;
  href: string;
};

export type SidebarGroup = {
  label: string;
  items: SidebarItem[];
};

export type SidebarProps = {
  groups: SidebarGroup[];
  /** href of the current page; the matching item gets the active treatment. */
  activeHref?: string;
  /** Renders a search input above the groups that filters items by label. */
  searchable?: boolean;
  /** Placeholder for the search input. Default "search…". */
  searchPlaceholder?: string;
  /** Anchor element/component for items — pass your router's Link. Default "a". */
  linkComponent?: React.ElementType;
  className?: string;
};

export function Sidebar({
  groups,
  activeHref,
  searchable = false,
  searchPlaceholder = "search…",
  linkComponent: LinkComponent = "a",
  className,
}: SidebarProps) {
  const [query, setQuery] = useState("");

  const visibleGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!searchable || q === "") return groups;
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter((item) =>
          item.label.toLowerCase().includes(q),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, query, searchable]);

  return (
    <aside
      className={cn(
        "w-[240px] shrink-0 border-r border-white/10 px-6 py-10 text-[13px]",
        className,
      )}
    >
      {searchable && (
        <div className="mb-7">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-white/30" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full border border-white/15 bg-transparent py-1.5 pl-8 pr-2.5 font-mono text-xs text-white placeholder:text-white/30 focus:border-white/40 focus:outline-none"
            />
          </div>
          {visibleGroups.length === 0 && (
            <div className="mt-3 font-mono text-[11px] text-white/35">
              no matches.
            </div>
          )}
        </div>
      )}
      {visibleGroups.map((group) => (
        <div key={group.label} className="mb-7">
          <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-white/40 mb-3">
            {group.label}
          </div>
          <ul className="space-y-1.5">
            {group.items.map((item) => {
              const active = item.href === activeHref;
              return (
                // Label + href, so items sharing a placeholder href ("#") stay unique.
                <li key={`${item.label}:${item.href}`}>
                  <LinkComponent
                    href={item.href}
                    className={cn(
                      "block py-0.5 transition-colors",
                      active
                        ? "text-white border-l-2 border-white pl-2.5 -ml-3 font-medium"
                        : "text-white/55 hover:text-white pl-0",
                    )}
                  >
                    {item.label}
                  </LinkComponent>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </aside>
  );
}
