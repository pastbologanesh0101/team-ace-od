import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Team ACE — OD Tracker",
  description: "On-Duty request tracker for Team ACE, VIT Vellore.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
