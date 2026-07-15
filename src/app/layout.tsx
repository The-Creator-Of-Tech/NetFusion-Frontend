import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { validateEnv } from "@/lib/env";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "NetFusion — Unified Network Analysis Workspace",
  description:
    "NetFusion brings network discovery, traffic analysis, investigation management, reporting, and team collaboration into a single platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  validateEnv();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        <Toaster
          position="bottom-right"
          gutter={8}
          containerStyle={{ bottom: 80 }}
          toastOptions={{
            duration: 3500,
            style: {
              background: "#161b22",
              color: "#e6edf3",
              border: "1px solid #30363d",
              borderRadius: "10px",
              fontSize: "13px",
              padding: "10px 14px",
            },
            success: {
              iconTheme: { primary: "#3fb950", secondary: "#0d1117" },
            },
            error: {
              iconTheme: { primary: "#f85149", secondary: "#0d1117" },
            },
          }}
        />
      </body>
    </html>
  );
}
