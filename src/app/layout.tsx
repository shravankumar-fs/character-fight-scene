import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'R3F Pointer Lock',
  description: 'PointerLockControls with @react-three/fiber and drei',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang='en'>
      <body>{children}</body>
    </html>
  );
}
