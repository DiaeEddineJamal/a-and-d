import Link from "next/link";

const games = [
  { name: "Mangolian Pong", eyebrow: "01 / TWO PLAYER", description: "Pong with yurt balls, thunder serves, and a desert storm that changes the rules mid-rally.", href: "/games/mangolian-pong", status: "PLAY NOW", color: "turquoise" },
  { name: "Kart Drift Club", eyebrow: "02 / ARRIVING SOON", description: "A new doorway is being built for this racing cabinet.", href: "#coming-soon", status: "LOCKED", color: "orange" },
];

export default function Home() {
  return <main className="portal-shell"><section className="portal-hero"><p className="eyebrow">LMONGOLYAN / SOCIAL ARCADE</p><div className="portal-title-wrap"><span className="title-stamp">INSERT<br />FRIENDS</span><h1 className="portal-title">THE<br /><em>YURT</em><br />ARCADE</h1></div><p className="portal-intro">A growing collection of small, loud games for your favourite people. Choose a cabinet and make a little chaos.</p><div className="portal-marquee" aria-hidden="true"><span>✦ LOCAL MAYHEM ✦ ONLINE NIGHTS ✦ NEW CABINETS SOON ✦ </span><span>LOCAL MAYHEM ✦ ONLINE NIGHTS ✦ NEW CABINETS SOON ✦ </span></div></section><section className="cabinet-grid" aria-label="Game library">{games.map((game, index) => <Link className={`cabinet cabinet-${game.color} ${index > 0 ? "cabinet-disabled" : ""}`} href={game.href} key={game.name} aria-disabled={index > 0}><span className="cabinet-index">{game.eyebrow}</span><div className="cabinet-art" aria-hidden="true">{index === 0 ? <><i className="paddle paddle-a" /><i className="orb" /><i className="paddle paddle-b" /></> : <i className="future-star">✦</i>}</div><h2>{game.name}</h2><p>{game.description}</p><span className="cabinet-action">{game.status} <b>↗</b></span></Link>)}</section><footer className="portal-footer"><span>MORE GAMES. SAME TABLE.</span><span>© 2026 LMONGOLYAN ARCADE</span></footer></main>;
}
