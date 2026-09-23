import Link from "next/link";

export default function NotFound() {
  return (
    <div className="container empty">
      <h1>Página não encontrada</h1>
      <Link href="/" className="btn">
        Voltar ao início
      </Link>
    </div>
  );
}
