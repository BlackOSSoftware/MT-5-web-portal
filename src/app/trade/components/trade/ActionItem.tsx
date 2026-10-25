"use client";

export default function ActionItem({
    label,
    onClick,
}: {
    label: string;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            className="
        w-full
        px-2
        py-4
        text-left
        hover:bg-[var(--bg-glass)]
        transition
      "
        >
            {label}
        </button>
    );
}