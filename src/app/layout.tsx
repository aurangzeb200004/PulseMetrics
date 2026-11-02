import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PulseMetrics — Real-Time Developer & App Telemetry Suite',
  description: 'Cinematic, real-time observability suite for indie hackers and high-velocity engineering teams.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#0a0a0f] text-gray-100 antialiased selection:bg-indigo-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}

