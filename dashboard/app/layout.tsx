import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI AGENT • NEXUS SOC",
  description: "Autonomous Infrastructure Monitoring & Resolution",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased font-sans bg-background text-foreground glow-mesh">
        {children}
      </body>
    </html>
  );
}
