import { notFound } from 'next/navigation';
import Pactra from '../../components/pactra';
import Marketplace from '../../components/marketplace';
export default async function Page({ params }: { params: Promise<{ path?: string[] }> }) {
  const { path = [] } = await params;
  if (!path.length) return <Marketplace />;
  if (path.length === 1 && path[0] === 'negotiate' || path.length === 2 && ['rooms', 'checkout'].includes(path[0])) return <Pactra />;
  notFound();
}
