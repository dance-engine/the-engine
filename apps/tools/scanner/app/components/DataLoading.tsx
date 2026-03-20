type DataLoadingProps = {
  message?: string;
  fullHeight?: boolean;
  tone?: "default" | "light";
};

export default function DataLoading({
  message = "Loading...",
  fullHeight = false,
  tone = "default",
}: DataLoadingProps) {
  const textClassName = tone === "light" ? "text-white" : "text-slate-600";
  const spinnerClassName = `h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent ${textClassName}`;

  if (fullHeight) {
    return (
      <div className="flex h-full min-h-[50vh] items-center justify-center text-center">
        <div className="flex flex-col items-center gap-3">
          <span className={spinnerClassName} aria-hidden="true" />
          <p className={`text-base ${textClassName}`}>{message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <span className={spinnerClassName} aria-hidden="true" />
      <p className={`text-sm ${textClassName}`}>{message}</p>
    </div>
  );
}