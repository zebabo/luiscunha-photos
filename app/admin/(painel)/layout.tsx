import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { paymentProvider } from "@/lib/config";
import { logout } from "../actions";

export const metadata: Metadata = { title: "Administração", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const provider = paymentProvider();
  return (
    <div className="container">
      <nav className="admin-nav">
        <Link href="/admin">Resumo</Link>
        <Link href="/admin/eventos">Eventos e fotos</Link>
        <Link href="/admin/encomendas">Encomendas</Link>
        <Link href="/admin/descontos">Códigos de desconto</Link>
        <form action={logout} style={{ marginLeft: "auto" }}>
          <button className="btn secondary small">Sair</button>
        </form>
      </nav>
      {provider !== "stripe" && (
        <div className="notice">
          {provider === "demo"
            ? "Pagamentos em modo demonstração: configure STRIPE_SECRET_KEY e STRIPE_WEBHOOK_SECRET para receber pagamentos reais."
            : "Pagamentos desativados: configure o Stripe para começar a vender."}
        </div>
      )}
      {children}
    </div>
  );
}
