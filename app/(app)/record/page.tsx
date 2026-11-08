import type { Metadata } from "next";
import { RecordPage } from "@/components/record/record-page";

export const metadata: Metadata = { title: "New Record" };

// The PWA home-screen shortcut lands here: Quick Record as a page of its own.
export default function Page() {
  return <RecordPage />;
}
