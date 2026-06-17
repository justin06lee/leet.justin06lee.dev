"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/chrome/button";

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
    <Button type="button" variant="ghost" size="sm" onClick={onDelete} disabled={isPending}>
      {isPending ? "deleting…" : "delete"}
    </Button>
  );
}
