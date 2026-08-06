import Link from 'next/link'
import Hero from '@/components/public/Hero'
import BrandFilm from '@/components/public/BrandFilm'
import { ProductCard, SectionHead } from '@/components/public/cards'
import { PRODUCTS, INFRA, ENGINES, TICKER } from '@/lib/public/data'

export default function HomePage() {
  return (
    <>
      <Hero />

      <div className="ticker">
        <div className="ticker-track">
          {[...TICKER, ...TICKER].map((t, i) => <span className="tk" key={i}>{t}</span>)}
        </div>
      </div>

      <section className="block wrap" id="film">
        <SectionHead kicker="Brand film" title={<>10 seconds of <span className="grad-text">Pranix</span></>} />
        <BrandFilm />
      </section>

      <section className="block wrap">
        <SectionHead kicker="The voice engine" title={<>Meet <span className="grad-text">Aaria</span> — one voice across everything</>}
          sub="Aaria is Pranix's multilingual voice layer. Ask in English, हिंदी or తెలుగు — she answers and acts inside every Pranix product, from school dashboards to price checks." />
        <div className="aaria-hero">
          <div className="aaria-orb-wrap rv">
            <div className="aaria-ring" /><div className="aaria-ring" style={{ animationDelay: '1.1s' }} /><div className="aaria-ring" style={{ animationDelay: '2.2s' }} />
            <div className="aaria-orb" />
            <div className="aaria-orb-core">🎙️</div>
          </div>
          <div className="rv d1">
            <ul className="feat">
              <li><b>Multilingual by birth</b> — Indian-language ASR &amp; TTS on a Bhashini-first, multi-provider stack</li>
              <li><b>Acts, not just answers</b> — voice queries live in EdProSys, rolling out to every product</li>
              <li><b>One engine, seven products</b> — the same Aaria understands schools, shops, venues and warranties</li>
            </ul>
            <Link className="btn btn-primary" href="/aaria">Talk to Aaria — live demo 🎙️</Link>
          </div>
        </div>
      </section>

      <section className="block wrap">
        <SectionHead kicker="The engines" title={<>Three engines. <span className="grad-text">One lab.</span></>}
          sub="Underneath the seven products run three in-house engines — voice, agents, and content — built once, used everywhere." />
        <div className="grid g3">
          {ENGINES.map((en, i) => (
            <div key={en.t} className={`icard rv d${i}`}><span className="iemj">{en.e}</span><div className="inum">{en.n}</div><h3>{en.t}</h3><p>{en.d}</p></div>
          ))}
        </div>
      </section>

      <section className="block wrap">
        <SectionHead kicker="Product ecosystem" title="Seven products. One operating fabric."
          sub="Every Pranix product runs on the same sovereign infrastructure — shared design system, shared control plane, founder-supervised AI execution." />
        <div className="grid g3">
          {PRODUCTS.map(p => <ProductCard key={p.id} p={p} />)}
        </div>
      </section>

      <section className="block wrap">
        <div className="stats">
          <div className="stat rv"><div className="num" data-count="7">0</div><div className="lbl">Products</div></div>
          <div className="stat rv d1"><div className="num" data-count="5">0</div><div className="lbl">Apps on Play Console</div></div>
          <div className="stat rv d2"><div className="num" data-count="1516" data-plus="1">0</div><div className="lbl">Live price links</div></div>
          <div className="stat rv d3"><div className="num" data-count="6">0</div><div className="lbl">Indian languages</div></div>
          <div className="stat rv d4"><div className="num" data-count="90" data-plus="1">0</div><div className="lbl">Warranty catalog items</div></div>
        </div>
      </section>

      <section className="block wrap">
        <SectionHead kicker="How we build" title={<>Protocol-grade <span className="grad-text">infrastructure</span></>} />
        <div className="grid g3">
          {INFRA.slice(0, 3).map((i, ix) => (
            <div key={i.t} className={`icard rv d${ix}`}><span className="iemj">{i.e}</span><h3>{i.t}</h3><p>{i.d}</p></div>
          ))}
        </div>
        <div style={{ marginTop: 30 }} className="rv"><Link className="plink" href="/infrastructure">See the full infrastructure →</Link></div>
      </section>

      <section className="wrap">
        <div className="cta-band rv">
          <h2>Building for a billion users, from Hyderabad.</h2>
          <p>Partner with us, try a product, or just say hi — we reply fast.</p>
          <div className="hero-ctas" style={{ marginTop: 0 }}>
            <Link className="btn btn-primary" href="/contact">Get in touch ✦</Link>
            <Link className="btn btn-ghost" href="/status">Live product status</Link>
          </div>
        </div>
      </section>
    </>
  )
}
