import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tea Chain ERP",
  description: "Operations platform for multi-location tea businesses.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
