import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

export const alt = `${SITE_NAME} : ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Image de partage (réseaux sociaux, WhatsApp, e-mails) générée à la compilation. */
export default async function OpengraphImage() {
  const mark = await readFile(path.join(process.cwd(), "public", "logo-mark.png"));
  const src = `data:image/png;base64,${mark.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", background: "linear-gradient(135deg, #0b1220 0%, #0f2a52 100%)", color: "#fff", padding: "0 80px", position: "relative" }}>
        <div style={{ position: "absolute", right: -120, top: -120, width: 520, height: 520, borderRadius: 999, background: "rgba(0,113,227,0.35)", filter: "blur(80px)" }} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <img src={src} width={84} height={84} alt="" />
            <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: -1 }}>{SITE_NAME}</div>
          </div>
          <div style={{ marginTop: 44, fontSize: 68, fontWeight: 700, lineHeight: 1.08, letterSpacing: -2, maxWidth: 820 }}>La stratégie de vos marques, claire et structurée.</div>
          <div style={{ marginTop: 28, fontSize: 30, color: "rgba(255,255,255,0.72)" }}>{`${SITE_TAGLINE} · Afrique de l’Ouest francophone`}</div>
        </div>
      </div>
    ),
    size,
  );
}
