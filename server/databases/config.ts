import { defineDatabase } from "vite-hub/database";
import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export default defineDatabase({
  schema: {
    agentInvocations: sqliteTable(
      "agent_invocations",
      {
        sequence: integer("sequence").primaryKey({ autoIncrement: true }),
        id: text("id").notNull().unique(),
        status: text("status", {
          enum: ["pending", "running", "completed", "failed", "cancelled"],
        }).notNull(),
        record: text("record", { mode: "json" }).$type<Record<string, unknown>>().notNull(),
        claimId: text("claim_id"),
        claimToken: text("claim_token"),
        claimExpiresAt: integer("claim_expires_at"),
        updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
      },
      (table) => [
        index("agent_invocations_status_idx").on(table.status),
        index("agent_invocations_updated_idx").on(table.updatedAt),
      ],
    ),
    meals: sqliteTable(
      "meals",
      {
        id: text("id").primaryKey(),
        caption: text("caption"),
        photoPath: text("photo_path"),
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
      (table) => [index("meals_created_idx").on(table.createdAt)],
    ),
  },
});
