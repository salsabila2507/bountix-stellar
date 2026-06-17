import { Inbox } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description: string;
};

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="rounded-lg border-2 border-[#140625] bg-white p-8 text-center text-[#140625] shadow-[6px_6px_0_#140625]">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg border-2 border-[#140625] bg-[#38e7ff] text-[#140625] shadow-[3px_3px_0_#140625]">
        <Inbox aria-hidden="true" className="h-5 w-5" />
      </div>
      <h3 className="mt-5 text-lg font-black text-[#140625]">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm font-semibold leading-6 text-[#5a3b66]">
        {description}
      </p>
    </div>
  );
}
