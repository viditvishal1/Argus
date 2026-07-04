import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";
import { GlobalSearchBar } from "@/components/GlobalSearchBar";

export const metadata: Metadata = {
  title: "EarthOS — Open Intelligence Operating System",
  description:
    "Search, read, filter, and cross-reference public data — news, cyber, aviation, maritime, space, markets and more — in one interface.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <div className="flex min-h-screen">
          <Nav />
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-line bg-[#0a0d12]/90 px-4 backdrop-blur">
              <GlobalSearchBar />
            </header>
            <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
