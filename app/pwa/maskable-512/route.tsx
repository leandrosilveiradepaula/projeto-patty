import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#003e1c",
          display: "flex",
          height: "100%",
          justifyContent: "center",
          width: "100%",
        }}
      >
        <div
          style={{
            alignItems: "center",
            background: "#e9f7f3",
            borderRadius: "999px",
            color: "#003e1c",
            display: "flex",
            fontSize: "113px",
            fontWeight: 700,
            height: "266px",
            justifyContent: "center",
            width: "266px",
          }}
        >
          C&amp;M
        </div>
      </div>
    ),
    {
      height: 512,
      width: 512,
    },
  );
}
