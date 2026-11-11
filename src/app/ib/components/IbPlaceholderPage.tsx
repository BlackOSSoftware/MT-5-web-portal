"use client";

import { Construction } from "lucide-react";
import { Card, IbPageShell } from "./ui";

export default function IbPlaceholderPage({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <IbPageShell>
      <Card className="flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--primary)]/12 text-[var(--primary)]">
          <Construction size={24} />
        </div>
        <h1 className="text-lg font-bold text-[var(--text-main)]">{title}</h1>
        <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">{description}</p>
      </Card>
    </IbPageShell>
  );
}
