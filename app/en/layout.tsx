import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "Personal Website",
    template: "%s | Personal Website",
  },
  description: "Browse and download my computer project files.",
  openGraph: {
    title: "Personal Website",
    description: "Browse and download my computer project files.",
    locale: "en_US",
    siteName: "Personal Website",
  },
};

export default function EnLayout({ children }: { children: ReactNode }) {
  return children;
}
