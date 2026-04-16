import Link from "next/link";
import { ReactNode } from "react";

type ActionIconButtonProps = {
  label: string;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  loading?: boolean;
  className?: string;
};

const ActionIconButton = ({
  label,
  icon,
  href,
  onClick,
  type = "button",
  disabled = false,
  loading = false,
  className = "",
}: ActionIconButtonProps) => {
  const baseClassName = [
    "flex items-center justify-center gap-2",
    "bg-keppel-on-light text-white",
    "px-1.5 py-1.5 rounded z-0",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    className,
  ]
    .join(" ")
    .trim();

  if (href) {
    return (
      <Link href={href} className={baseClassName} aria-label={label} title={label}>
        {icon}
        <span className="sr-only">{label}</span>
      </Link>
    );
  }

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={baseClassName}
      aria-label={label}
      title={label}
    >
      {icon}
      <span className="sr-only">{label}</span>
    </button>
  );
};

export default ActionIconButton;
