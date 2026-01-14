import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Evolution Kit - M4 Next Client",
  description: "AI UX Engineering with Vercel AI SDK",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50 min-h-screen">{children}</body>
    </html>
  );
}
