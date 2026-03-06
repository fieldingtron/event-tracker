import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "Pulseboard",
  description: "Real-time project event monitoring with Supabase and Next.js.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
