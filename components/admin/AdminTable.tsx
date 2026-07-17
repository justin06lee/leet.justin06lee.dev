import { cn } from "@/lib/utils";

export type AdminColumn<T> = {
  /** Stable key for the column — also the React key for each cell. */
  key: string;
  header: string;
  /** Right-align numeric or action columns. */
  align?: "left" | "right";
  /** Hide below sm, for columns that don't survive a narrow viewport. */
  hideOnMobile?: boolean;
  render: (row: T) => React.ReactNode;
};

export type AdminTableProps<T> = {
  columns: AdminColumn<T>[];
  rows: T[];
  getKey: (row: T) => string;
  /** Shown in place of the body when there are no rows. */
  empty: string;
  className?: string;
};

/**
 * The admin list table.
 *
 * Deliberately not chrome's `manager-table`: that one models rename-in-place +
 * recolor + archive over `{ id, name, color, archived }`, which doesn't match
 * these rows — titles are edited in the full form (a rename has to regenerate
 * the slug), there is nothing to recolor, and `published` is not `archived`.
 * This is the shared table those three admin lists actually need.
 */
export function AdminTable<T>({
  columns,
  rows,
  getKey,
  empty,
  className,
}: AdminTableProps<T>) {
  if (rows.length === 0) {
    return (
      <p className={cn("border border-dashed border-white/15 p-6 text-sm text-white/50", className)}>
        {empty}
      </p>
    );
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-white/15">
            {columns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={cn(
                  "py-2 pr-4 font-mono text-[11px] font-normal uppercase tracking-[0.18em] text-white/40",
                  col.align === "right" ? "text-right" : "text-left",
                  col.hideOnMobile && "hidden sm:table-cell",
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={getKey(row)}
              className="border-b border-white/5 transition-colors hover:bg-white/5"
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "py-2.5 pr-4 align-middle",
                    col.align === "right" ? "text-right" : "text-left",
                    col.hideOnMobile && "hidden sm:table-cell",
                  )}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
