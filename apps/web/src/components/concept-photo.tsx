const photos: Record<string, string> = { camera: 'camera', microphone: 'audio', tripod: 'tripod', light: 'light', storage: 'storage' };
export default function ConceptPhoto({ role, className, eager = false }: { role: string; className?: string; eager?: boolean }) {
  const category = ['bags','home','electronics','fashion'].includes(role) ? role : 'other';
  return <img src={photos[role] ? `/images/${photos[role]}-concept.webp` : `/images/category-${category}.svg`} alt={`Illustration for a demo ${role.replaceAll('_',' ')} product`} className={className} width={800} height={800} loading={eager ? 'eager' : 'lazy'} decoding="async"/>;
}
