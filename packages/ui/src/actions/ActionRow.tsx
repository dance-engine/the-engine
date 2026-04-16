import { ReactNode } from "react";

type ActionRowProps = {
  children: ReactNode;
  className?: string;
};

const ActionRow = ({ children, className = "" }: ActionRowProps) => {
  return (
    <div className={`flex gap-2 justify-end items-center ${className}`.trim()}>
      {children}
    </div>
  );
};

export default ActionRow;
