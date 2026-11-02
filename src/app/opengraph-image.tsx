import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "SplitLedger AI — Smart Expense Tracker & Group Expense Manager";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          backgroundColor: "#090d16",
          padding: "80px",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              width: "60px",
              height: "60px",
              borderRadius: "16px",
              background: "linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "32px",
              color: "#ffffff",
              fontWeight: 800,
            }}
          >
            S
          </div>
          <span
            style={{
              fontSize: "32px",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "#ffffff",
            }}
          >
            SplitLedger AI
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div
            style={{
              display: "flex",
              fontSize: "64px",
              fontWeight: 900,
              letterSpacing: "-0.04em",
              lineHeight: 1.1,
              color: "#ffffff",
              maxWidth: "1000px",
            }}
          >
            Smart Expense Tracker & Group Expense Manager
          </div>
          <div
            style={{
              fontSize: "24px",
              color: "#94a3b8",
              maxWidth: "850px",
              lineHeight: 1.4,
            }}
          >
            Autonomous ledger intelligence, multi-person split netting, receipt OCR, and instant UPI settlement for modern teams and individuals.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "32px",
            fontSize: "18px",
            color: "#64748b",
            fontWeight: 600,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#38bdf8" }}>
            <span>✓</span> Automated Split Netting
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#38bdf8" }}>
            <span>✓</span> In-House Financial AI
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#38bdf8" }}>
            <span>✓</span> Real-Time Double Entry
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

