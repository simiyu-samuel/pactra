import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Pactra — Your agent negotiates. You make the call.', manifest: '/manifest.webmanifest', description: 'Buyer and seller agents negotiate product deals within your limits. Compare offers, choose your agreement, and approve payment with PayPal.' };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
