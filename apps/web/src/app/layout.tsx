import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Pactra — Your terms. Negotiated.', description: 'Watch your buyer agent negotiate with three seller agents. Compare real tradeoffs and approve the exact agreement through PayPal sandbox.' };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
