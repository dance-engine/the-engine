import type { ReactNode } from "react";

type TopActionBarProps = {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  action?: ReactNode;
};

function BackIcon() {
  return (
    <svg
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export default function TopActionBar({
  title,
  subtitle,
  onBack,
  action,
}: TopActionBarProps) {
  const backButtonClassName =
    "inline-flex items-center justify-center rounded-full border border-current/15 bg-white/10 p-1 transition-colors hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-current/30";

  return (
    <div className="flex p-4 items-start bg-uberdark-background justify-between gap-3">
      <div className="flex min-w-0 items-center gap-3">
        {onBack ? (
          <button type="button" onClick={onBack} className={backButtonClassName}>
            <BackIcon />
            <span className="sr-only">Go back</span>
          </button>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-base font-semibold">{title}</h2>
          {subtitle ? <p className="text-sm opacity-75">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
