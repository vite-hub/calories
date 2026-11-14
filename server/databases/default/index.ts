import { defineDatabase } from "vite-hub/database";
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export default defineDatabase({
  schema: {
    meals: sqliteTable(
      "meals",
      {
        id: text("id").primaryKey(),
        caption: text("caption"),
        photoPath: text("photo_path"),
        // Telegram's file_unique_id: the same photo always has the same value.
        photoFileId: text("photo_file_id"),
        items: text("items", { mode: "json" })
          .$type<
            Array<{
              calories?: number;
              item?: string;
              kcal?: number;
              name?: string;
              portion?: string;
              portion_g?: number;
              protein?: number;
            }>
          >()
          .default([])
          .notNull(),
        totalCalories: integer("total_calories"),
        totalProtein: integer("total_protein"),
        usageCost: text("usage_cost"),
        confidence: text("confidence", { enum: ["low", "medium", "high", "user-stated"] }),
        createdAt: integer("created_at", { mode: "timestamp_ms" })
          .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
          .notNull(),
      },
      (table) => [
        index("meals_created_idx").on(table.createdAt),
        index("meals_photo_file_idx").on(table.photoFileId),
      ],
    ),
  },
});
