import { LoaderCircle } from "lucide-react";

export default function DashboardLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoaderCircle className="h-8 w-8 animate-spin text-[#7c3cff]" />
    </div>
  );
}
