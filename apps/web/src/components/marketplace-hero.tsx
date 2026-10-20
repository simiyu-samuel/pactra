import { ArrowUpRight, ShieldCheck } from 'lucide-react';
import s from './marketplace-hero.module.css';

export default function MarketplaceHero() {
  return <section className={s.hero} aria-label="Buyer and seller agents negotiate">
    <picture className={s.scene}>
      <source media="(max-width: 600px)" srcSet="/images/agents-negotiation-hero-mobile.webp"/>
      <img src="/images/agents-negotiation-hero.webp" alt="Illustration of two humanoid agents negotiating over headphones: a buyer proposes $79 and a seller asks $88, with example three-day delivery and a twelve-month warranty." width={1904} height={826} fetchPriority="high" loading="eager" decoding="async"/>
    </picture>
    <div className={s.shade}/>
    <div className={s.content}>
      <div className={s.copy}>
        <span className={s.eyebrow}>BUYER AGENTS. SELLER AGENTS. BETTER AGREEMENTS.</span>
        <h1>Your agent negotiates.<br/><em>You make the call.</em></h1>
        <p>Buyers want better terms. Sellers need fair margins. Pactra gives each side an agent to work towards a deal.</p>
        <div className={s.actions}>
          <a href="/negotiate" className={s.primary}>Start a negotiation <ArrowUpRight size={18}/></a>
          <a href="/seller-console" className={s.secondary}>Set up your seller agent <ArrowUpRight size={15}/></a>
        </div>
        <div className={s.proof}><ShieldCheck size={16}/><span>Your limits respected. Your approval, always.</span></div>
      </div>
    </div>
    <p className={s.caption}>An illustrated negotiation. Your real deal starts with your terms.</p>
  </section>;
}
