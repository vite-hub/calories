import { eq } from "drizzle-orm";
import { defineHandler, getValidatedRouterParams, HTTPError } from "nitro/h3";
import { blob } from "vite-hub/blob";
import { useDatabase } from "vite-hub/database";
import { z } from "zod";

export default defineHandler(async (event) => {
  const { id } = await getValidatedRouterParams(event, z.object({
    id: z.string().min(1).max(200).regex(/^[^/\\]+$/),
  }), { decode: true });
  const { db, schema } = useDatabase("default");
  const [meal] = await db.select({ photoPath: schema.meals.photoPath }).from(schema.meals).where(eq(schema.meals.id, id)).limit(1);
  if (!meal?.photoPath) throw HTTPError.status(404, "Meal photo not found");

  // A resized upright JPEG without the camera metadata. The original stays private.
  return blob.serve(event.req, meal.photoPath, {
    cacheControl: "public, max-age=300, must-revalidate",
    variant: { width: 768, height: 768, fit: "inside", format: "jpeg", quality: 80 },
  });
});
