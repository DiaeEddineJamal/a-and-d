import Link from "next/link";
import { PongGame } from "./pong-game";
export default function MangolianPongPage() { return <main className="game-page"><header className="game-topbar"><Link className="back-link" href="/">← ARCADE HALL</Link><h1 className="game-brand">MANGOLIAN <span>PONG</span></h1><span className="back-link">CABINET 01</span></header><PongGame /></main>; }
