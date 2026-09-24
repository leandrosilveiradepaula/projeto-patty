export const AI_FAILURE_MESSAGE_MAX_CODE_POINTS = 1024;
export const AI_FAILURE_RESPONSE_MAX_BYTES = 128 * 1024;

const encoder = new TextEncoder();

function utf8ByteLength(value: string) {
  return encoder.encode(value).length;
}

function replaceNullCharacters(value: string) {
  return value.replace(/\u0000/g, "\uFFFD");
}

function truncateUtf8WithMarker(
  value: string,
  maxBytes: number,
  marker: string,
) {
  const markerBytes = utf8ByteLength(marker);

  if (markerBytes >= maxBytes) {
    throw new Error("AI failure retention marker exceeds byte budget.");
  }

  const prefixBudget = maxBytes - markerBytes;
  let usedBytes = 0;
  let prefix = "";

  for (const codePoint of value) {
    const codePointBytes = utf8ByteLength(codePoint);

    if (usedBytes + codePointBytes > prefixBudget) {
      break;
    }

    prefix += codePoint;
    usedBytes += codePointBytes;
  }

  return prefix + marker;
}

export function sanitizeAiFailureMessage(value: string | null) {
  if (value === null) {
    return null;
  }

  const normalized = replaceNullCharacters(value)
    .replace(/\s+/gu, " ")
    .trim();

  if (!normalized) {
    return null;
  }

  const codePoints = Array.from(normalized);

  if (codePoints.length <= AI_FAILURE_MESSAGE_MAX_CODE_POINTS) {
    return normalized;
  }

  return (
    codePoints
      .slice(0, AI_FAILURE_MESSAGE_MAX_CODE_POINTS - 1)
      .join("") + "…"
  );
}

export function retainAiFailureResponse(input: {
  content: string | null;
  contentFormat: "json" | "text" | null;
}) {
  if (input.content === null) {
    return {
      content: null,
      contentFormat: null,
      originalByteLength: 0,
      truncated: false,
    } as const;
  }

  const storageSafeContent = replaceNullCharacters(input.content);
  const originalByteLength = utf8ByteLength(storageSafeContent);

  if (originalByteLength <= AI_FAILURE_RESPONSE_MAX_BYTES) {
    return {
      content: storageSafeContent,
      contentFormat: input.contentFormat ?? "text",
      originalByteLength,
      truncated: false,
    } as const;
  }

  const originalFormat = input.contentFormat ?? "unknown";
  const marker =
    "\n[truncated by AI failure retention boundary; original_bytes=" +
    originalByteLength +
    "; original_format=" +
    originalFormat +
    "]";

  return {
    content: truncateUtf8WithMarker(
      storageSafeContent,
      AI_FAILURE_RESPONSE_MAX_BYTES,
      marker,
    ),
    contentFormat: "text",
    originalByteLength,
    truncated: true,
  } as const;
}
