"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

export default function DeleteButton({
  id,
  action,
}: {
  id: string;
  action: (id: string) => Promise<{ ok: boolean }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function onDelete() {
    startTransition(async () => {
      await action(id);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={isPending}
      className="text-sm text-muted underline underline-offset-4 hover:text-foreground disabled:opacity-50 lowercase"
    >
      {isPending ? "deleting…" : "delete"}
    </button>
  );
}
