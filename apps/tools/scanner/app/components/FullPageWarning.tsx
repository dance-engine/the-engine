type FullPageWarningProps = {
  title: string;
  description: string;
};

export default function FullPageWarning({ title, description }: FullPageWarningProps) {
  return (
    <div className="grid h-full min-h-[50vh] place-items-center text-center">
      Full Page
      <div className="px-4">
        <p className="text-xl font-semibold text-primary-text-highlight">{title}</p>
        <p className="mt-1 text-xs text-slate-300">{description}</p>
      </div>
    </div>
  );
}