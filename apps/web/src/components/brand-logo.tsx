export default function BrandLogo({ light = false }: { light?: boolean }) {
  return <img src={light ? '/brand/pactra-logo-light.svg' : '/brand/pactra-logo.svg'} alt="Pactra" width={154} height={34} style={{display:'block',width:154,height:34}}/>;
}
