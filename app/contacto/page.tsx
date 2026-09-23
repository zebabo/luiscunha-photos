import type { Metadata } from "next";
import { getSettings, instagramUrl } from "@/lib/settings";
import { getT } from "@/lib/i18n-server";
import { ContactForm } from "./ContactForm";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("contact.title") };
}

export default async function ContactPage() {
  const { t } = await getT();
  const s = getSettings();
  const phoneDigits = s.phone.replace(/[^\d+]/g, "");
  // Números portugueses sem indicativo: o WhatsApp precisa do 351.
  const waNumber = phoneDigits.startsWith("+") ? phoneDigits.slice(1) : phoneDigits.length === 9 ? `351${phoneDigits}` : phoneDigits;
  return (
    <div className="container">
      <h1 className="section-title" style={{ marginTop: 48 }}>
        {t("contact.title")}
      </h1>
      <p className="section-sub">{t("contact.intro")}</p>
      <div className="about">
        <ul className="contact-list">
          {s.contact_email && (
            <li>
              ✉ <a href={`mailto:${s.contact_email}`}>{s.contact_email}</a>
            </li>
          )}
          {s.phone && (
            <li>
              ☎ <a href={`tel:${phoneDigits}`}>{s.phone}</a>
              {" · "}
              <a href={`https://wa.me/${waNumber}`} target="_blank" rel="noopener noreferrer">
                WhatsApp
              </a>
            </li>
          )}
          {s.instagram && (
            <li>
              ◎{" "}
              <a href={instagramUrl(s.instagram)} target="_blank" rel="noopener noreferrer">
                Instagram {s.instagram.startsWith("@") ? s.instagram : ""}
              </a>
            </li>
          )}
        </ul>
        <ContactForm />
      </div>
    </div>
  );
}
