import { ImageResponse } from "next/og";

export const dynamic = "force-static";
const size = { width: 1200, height: 630 };

export function GET() {
  return new ImageResponse(
    <div style={{ display: "flex", width: "100%", height: "100%", background: "#f7f9fc", color: "#142d4e", padding: "90px", flexDirection: "column", justifyContent: "center" }}>
      <div style={{ display: "flex", fontSize: 88, fontWeight: 700 }}>Novaris</div>
      <div style={{ display: "flex", width: 92, height: 5, background: "#c9a468", margin: "32px 0" }} />
      <div style={{ display: "flex", fontSize: 34 }}>Competition problems. Reasoned explanations.</div>
      <div style={{ display: "flex", fontSize: 25, color: "#4b5c70", marginTop: 28 }}>Mathematics · Physics · Computer science</div>
    </div>, size,
  );
}
