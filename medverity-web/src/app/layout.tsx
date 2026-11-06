import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "./client-layout";

export const metadata: Metadata = {
  title: "MedVerity — Understand Your Medicine",
  description: "OCR & NLP-driven vernacular medicine explainer and dosage safety reminder app. Scan your medicine and get instant information in your language.",
  keywords: ["medicine", "OCR", "health", "dosage", "reminder", "vernacular", "MedVerity"],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
