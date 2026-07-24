import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { validateEnv } from "@/lib/env";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "NetFusion — Enterprise Cybersecurity Platform",
  description:
    "NetFusion brings network discovery, traffic analysis, threat reasoning, evidence management, and SOC collaboration into a unified enterprise platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  validateEnv();

  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background text-foreground selection:bg-accent/20 selection:text-foreground`}
      >
        {children}
        <Toaster
          position="bottom-right"
          gutter={8}
          containerStyle={{ bottom: 80 }}
          toastOptions={{
            duration: 3500,
            style: {
              background: "#111827",
              color: "#F8FAFC",
              border: "1px solid #273449",
              borderRadius: "12px",
              fontSize: "13px",
              padding: "10px 14px",
              boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.5)",
            },
            success: {
              iconTheme: { primary: "#16A34A", secondary: "#0B1220" },
            },
            error: {
              iconTheme: { primary: "#DC2626", secondary: "#0B1220" },
            },
          }}
        />
      </body>
    </html>
  );
}
