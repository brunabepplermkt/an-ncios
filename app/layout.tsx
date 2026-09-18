import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Sidebar } from "@/components/Sidebar";
import { MobileNav } from "@/components/MobileNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Ads Manager IA",
  description: "Gerenciador de anúncios Meta + Google com análise por IA (uso próprio).",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <div className="flex min-h-screen">
          <aside className="hidden md:block w-60 shrink-0 border-r border-border bg-surface">
            <div className="sticky top-0 h-screen overflow-y-auto">
              <Sidebar />
            </div>
          </aside>
          <div className="flex min-w-0 flex-1 flex-col">
            <MobileNav />
            <main className="flex-1 min-w-0 p-4 md:p-8">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
