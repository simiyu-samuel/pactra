const images: Record<string,string> = { camera: 'camera', microphone: 'audio', tripod: 'tripod', light: 'light', storage: 'storage' };
/** Original generated concept art for the explicitly fictional native catalog only. */
export default function ConceptPhoto({ role, className, eager = false }: { role: string; className?: string; eager?: boolean }) {
  return <img src={`/images/${images[role] || 'camera'}-concept.webp`} alt={`Illustrative ${role} concept for the fictional Pactra demo`} className={className} width={800} height={800} loading={eager ? 'eager' : 'lazy'} decoding="async"/>;
}
