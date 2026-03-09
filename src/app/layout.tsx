import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'ClaudeOS',
  description: 'Module-based self-expanding agent OS',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="h-screen w-screen overflow-hidden">{children}</body>
    </html>
  );
}
