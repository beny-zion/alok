import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AL CRM — ניהול מועמדים",
  description: "מערכת ניהול מועמדים ודיוור — AL גיוס עובדים והשמה",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" className={`${geistSans.variable} h-full antialiased`}>
      <body className="min-h-full flex bg-muted/30">
        <Sidebar />
        <main className="flex-1 mr-64 p-6">{children}</main>
        <Toaster position="top-center" richColors />
      </body>
    </html>
  );
}
