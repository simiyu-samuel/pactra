import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'Pactra — Good finds. Great possibilities.', description: 'Discover products across stores, compare your options, and negotiate with Pactra sellers. External offers take you to the original merchant.' };
export default function Layout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
