"use client";

import Select from "./Select";

type PaginationProps = {
  page: number;
  totalPages: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
};

export default function Pagination({
  page,
  totalPages,
  limit,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  const limitOptions = [
    { label: "10", value: "10" },
    { label: "20", value: "20" },
    { label: "50", value: "50" },
  ];

  return (
    <div className="mt-6 w-full rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4">

      {/* MOBILE STACK */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

        {/* ROWS PER PAGE */}
        <div className="flex items-center justify-between gap-3 w-full md:w-auto">
          <span className="text-xs font-medium text-[var(--text-muted)] whitespace-nowrap">
            Rows per page
          </span>

          <div className="w-24">
            <Select
              options={limitOptions}
              value={limit.toString()}
              onChange={(value) => onLimitChange(Number(value))}
              label={undefined}
            />
          </div>
        </div>

        {/* PAGE INFO + CONTROLS */}
        <div className="flex flex-col items-center gap-3 w-full md:w-auto">

          {/* PAGE TEXT */}
          <div className="text-xs text-[var(--text-muted)] text-center">
            Page <span className="font-semibold">{page}</span> of{" "}
            <span className="font-semibold">{totalPages}</span>
          </div>

          {/* BUTTONS */}
          <div className="flex items-center justify-center gap-2 flex-wrap">

            <PageBtn
              disabled={page === 1}
              onClick={() => onPageChange(1)}
            >
              «
            </PageBtn>

            <PageBtn
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}
            >
              ‹
            </PageBtn>

            {/* CURRENT PAGE */}
            <div className="min-w-[44px] h-[44px] flex items-center justify-center rounded-xl bg-[var(--primary)] text-white text-sm font-semibold shadow-sm">
              {page}
            </div>

            <PageBtn
              disabled={page === totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              ›
            </PageBtn>

            <PageBtn
              disabled={page === totalPages}
              onClick={() => onPageChange(totalPages)}
            >
              »
            </PageBtn>

          </div>
        </div>
      </div>
    </div>
  );
}

/* ================= BUTTON ================= */
function PageBtn({
  children,
  disabled,
  onClick,
}: {
  children: React.ReactNode;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className="
        min-w-[44px]
        h-[44px]
        rounded-xl
        text-sm font-medium
        bg-[var(--input-bg)]
        border border-[var(--input-border)]
        text-[var(--text-primary)]
        transition
        hover:bg-[var(--hover-bg)]
        active:scale-95
        disabled:opacity-40
        disabled:cursor-not-allowed
      "
    >
      {children}
    </button>
  );
}
