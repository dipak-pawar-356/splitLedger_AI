import { ImageResponse } from "next/og";

// Route segment config
export const runtime = "edge";

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = "image/png";

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 20,
          background: "linear-gradient(135deg, #4F46E5 0%, #6366F1 50%, #0EA5E9 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 8,
          color: "white",
          fontWeight: 900,
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
        }}
      >
        <span style={{ fontSize: 18, color: "#FDE047", marginRight: 1 }}>✦</span>
        <span style={{ fontSize: 16, color: "#FFFFFF", fontWeight: "bold" }}>S</span>
      </div>
    ),
    {
      ...size,
    }
  );
}
