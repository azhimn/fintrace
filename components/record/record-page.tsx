"use client";

import { useRouter } from "next/navigation";
import { RecordForm } from "./record-form";
import { useRecord } from "./record-provider";

export function RecordPage() {
  const router = useRouter();
  const { data } = useRecord();
  // Offline the Overview may not load, so stay here for the next entry.
  const home = () => navigator.onLine && router.push("/");
  return (
    <div className="fixed inset-0 z-10 flex flex-col bg-background lg:static lg:mx-auto lg:my-10 lg:max-w-lg lg:overflow-hidden lg:rounded-sheet">
      <RecordForm
        data={data}
        handleEscape
        onDone={home}
        onClose={home}
        title={<h1 className="text-base font-medium">Record</h1>}
      />
    </div>
  );
}
