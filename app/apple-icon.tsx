import { ImageResponse } from "next/og";

export const size = {
  width: 180,
  height: 180,
};

export const contentType = "image/png";

export default function AppleIcon() {
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
            fontSize: "40px",
            fontWeight: 700,
            height: "108px",
            justifyContent: "center",
            width: "108px",
          }}
        >
          C&amp;M
        </div>
      </div>
    ),
    {
      ...size,
    },
  );
}
