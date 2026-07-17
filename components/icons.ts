"use client";

/**
 * Client-reference re-exports of the lucide icons we pass as *props*.
 *
 * lucide-react's icon modules carry no "use client" directive, so importing an
 * icon straight into a server component yields a plain server function — and
 * handing that to a client component (chrome's Button takes `icon`/`iconRight`)
 * fails with "Functions cannot be passed directly to Client Components".
 *
 * Re-exporting through this "use client" module makes each icon a client
 * reference, which crosses the boundary fine. Import from here whenever an icon
 * is passed as a prop; importing from "lucide-react" directly is still correct
 * when the icon is rendered as JSX (`<BookOpen />`) in a server component.
 */
export { ArrowLeft, ArrowRight, Play, Plus, RotateCcw } from "lucide-react";
