import { createHash } from "node:crypto";

interface SyncProductImageArgs {
  productSlug: string;
  sourceUrl: string | null;
  existingImageUrl: string | null;
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const SUPABASE_MEDIA_BUCKET = process.env.SUPABASE_MEDIA_BUCKET ?? "media";

export async function syncProductImageToStorage(
  args: SyncProductImageArgs
) {
  const { productSlug, sourceUrl, existingImageUrl } = args;

  if (!sourceUrl) {
    return existingImageUrl;
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return sourceUrl;
  }

  const sourceHash = createStableHash(sourceUrl);
  const remoteMeta = await fetchRemoteImageMetadata(sourceUrl);
  const existingImageMeta = parseStoredImageUrl(existingImageUrl);
  if (
    existingImageUrl &&
    existingImageMeta?.sourceHash === sourceHash &&
    remoteMeta.fingerprint &&
    existingImageMeta.fingerprint === sanitizePathToken(remoteMeta.fingerprint)
  ) {
    return existingImageUrl;
  }

  const response = await fetch(sourceUrl);
  if (!response.ok) {
    throw new Error(`Failed to download product image: ${response.status} ${response.statusText}`);
  }

  const contentType = response.headers.get("content-type") ?? "application/octet-stream";
  const bytes = new Uint8Array(await response.arrayBuffer());
  const contentHash = createStableHash(bytes);
  const fingerprint = sanitizePathToken(remoteMeta.fingerprint ?? contentHash);
  if (
    existingImageUrl &&
    existingImageMeta?.sourceHash === sourceHash &&
    existingImageMeta.fingerprint === fingerprint
  ) {
    return existingImageUrl;
  }

  const extension = inferImageExtension(contentType, sourceUrl);
  const path = `products/${productSlug}/${sourceHash}-${fingerprint}.${extension}`;
  const uploadResponse = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${SUPABASE_MEDIA_BUCKET}/${path}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": contentType,
        "x-upsert": "true",
      },
      body: bytes,
    }
  );

  if (!uploadResponse.ok) {
    throw new Error(
      `Failed to upload product image: ${uploadResponse.status} ${uploadResponse.statusText}`
    );
  }

  return `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_MEDIA_BUCKET}/${path}`;
}

async function fetchRemoteImageMetadata(sourceUrl: string) {
  try {
    const response = await fetch(sourceUrl, { method: "HEAD", redirect: "follow" });
    if (!response.ok) {
      return { fingerprint: null as string | null };
    }

    const etag = normalizeHeaderValue(response.headers.get("etag"));
    const contentLength = normalizeHeaderValue(response.headers.get("content-length"));
    const lastModified = normalizeHeaderValue(response.headers.get("last-modified"));
    const fingerprint = [etag, contentLength, lastModified].filter(Boolean).join("|") || null;
    return { fingerprint };
  } catch {
    return { fingerprint: null as string | null };
  }
}

function normalizeHeaderValue(value: string | null) {
  return value?.trim() || null;
}

function sanitizePathToken(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function createStableHash(value: string | Uint8Array) {
  return createHash("sha256").update(value).digest("hex").slice(0, 20);
}

function parseStoredImageUrl(imageUrl: string | null) {
  if (!imageUrl) return null;

  const filename = imageUrl.split("/").pop()?.split("?")[0] ?? "";
  const match = /^(?<sourceHash>[a-f0-9]{20})-(?<fingerprint>.+)\.[a-z0-9]+$/i.exec(filename);
  if (!match?.groups) {
    return null;
  }

  return {
    sourceHash: match.groups.sourceHash,
    fingerprint: match.groups.fingerprint,
  };
}

function inferImageExtension(contentType: string, sourceUrl: string) {
  const lowerType = contentType.toLowerCase();
  if (lowerType.includes("png")) return "png";
  if (lowerType.includes("webp")) return "webp";
  if (lowerType.includes("gif")) return "gif";
  if (lowerType.includes("svg")) return "svg";
  if (lowerType.includes("jpeg") || lowerType.includes("jpg")) return "jpg";

  const cleanUrl = sourceUrl.split("?")[0]?.toLowerCase() ?? "";
  if (cleanUrl.endsWith(".png")) return "png";
  if (cleanUrl.endsWith(".webp")) return "webp";
  if (cleanUrl.endsWith(".gif")) return "gif";
  if (cleanUrl.endsWith(".svg")) return "svg";
  if (cleanUrl.endsWith(".jpeg") || cleanUrl.endsWith(".jpg")) return "jpg";
  return "jpg";
}
