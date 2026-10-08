export function educationalContentPublicationNeedsAsset(
  contentTypeKey: string | null,
) {
  return contentTypeKey === "video";
}

export function canPublishEducationalContentVersion(input: {
  contentTypeKey: string | null;
  hasAsset: boolean;
}) {
  return (
    !educationalContentPublicationNeedsAsset(input.contentTypeKey) ||
    input.hasAsset
  );
}
