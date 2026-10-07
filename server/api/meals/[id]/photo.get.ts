import { eq } from "drizzle-orm";
import { defineHandler, getValidatedRouterParams, HTTPError } from "nitro/h3";
import { blob } from "vite-hub/blob";
import { useDatabase } from "vite-hub/database/drizzle";
import { z } from "zod";
import { createMealPhotoPreview } from "../../../utils/meal-photo.ts";

export default defineHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, z.object({
    id: z.string().min(1).max(200).regex(/^[^/\\]+$/),
  }), { decode: true });
  const { db, schema } = useDatabase("default");
  const [meal] = await db.select({ photoPath: schema.meals.photoPath }).from(schema.meals).where(eq(schema.meals.id, id)).limit(1);
  if (!meal?.photoPath) throw HTTPError.status(404, "Meal photo not found");

  const [headError, original] = await blob.head(meal.photoPath);
  if (headError || !original) throw HTTPError.status(404, "Meal photo not found");
  if ((original.size ?? 0) > 10 * 1024 * 1024) throw HTTPError.status(413, "Meal photo is too large");
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(
    `v1:${meal.photoPath}:${original.httpEtag ?? original.uploadedAt.toISOString()}`,
  ));
  const fingerprint = Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const headers = {
    "Cache-Control": "public, max-age=300, must-revalidate",
    "Content-Type": "image/jpeg",
    "ETag": `"${fingerprint}"`,
    "X-Content-Type-Options": "nosniff",
  };
  if (event.req.headers.get("if-none-match") === headers.ETag) return new Response(null, { status: 304, headers });

  const previewPath = `meal-previews/${encodeURIComponent(id)}/${fingerprint}.jpg`;
  const [, cached] = await blob.get(previewPath);
  if (cached) return new Response(cached, { headers });
  const [readError, photo] = await blob.get(meal.photoPath);
  if (readError || !photo) throw HTTPError.status(404, "Meal photo not found");
  let preview: Uint8Array;
  try {
    preview = createMealPhotoPreview(new Uint8Array(await photo.arrayBuffer()));
  } catch (error) {
    console.error("[calories] Meal photo preview failed", error);
    throw HTTPError.status(422, "Meal photo preview unavailable");
  }
  const [cacheError] = await blob.put(previewPath, preview, { contentType: "image/jpeg" });
  if (cacheError) console.error("[calories] Meal photo preview cache failed", cacheError);
  return new Response(new Uint8Array(preview), { headers });
});
