import Link from "next/link";
import { getT } from "@/lib/i18n-server";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <div className="container empty">
      <h1>{t("notfound.title")}</h1>
      <Link href="/" className="btn">
        {t("notfound.back")}
      </Link>
    </div>
  );
}
