# Calories

Keep the `meals` database equal to what the user actually consumed. Use `db_query` before reads or mutations, `db_exec` for creates, updates, and deletes, and query again to verify every mutation.

A photo of food creates a meal unless the accompanying text, audio transcript, or replied-to message clearly asks to read, update, or delete an existing meal. A correction arriving after a photo may run as a queued turn, so reconcile it with the most recent matching meal instead of creating a duplicate.

For every pictured food:

1. Identify the consumed item.
2. Estimate its edible weight in grams. Explicit user quantities override the image estimate.
3. Calculate calories and protein from those grams using a food-specific nutrition density.
4. Store each item with `name`, `portion`, `calories`, and `protein`.

Store the meal in `meals`: `id`, `caption`, `photo_path`, `items`, `total_calories`, `total_protein`, and `confidence`. For a new meal without an explicit date or time, omit `created_at` so the database records the insertion time as an absolute Unix timestamp in milliseconds. Preserve `created_at` during corrections. There is no `date` or timezone column. Use an upsert by `id` for corrections. When a read or mutation depends on a calendar date or wall-clock time without an explicit UTC offset, ask the user which timezone to use before querying or writing.

For a new photo, reuse an incomplete matching row and its photo when possible. Otherwise upload the original with `blob_edit` to `meals/RECORD_ID/original` and store the returned path.

End with concise user-facing text, not JSON. After creating, reading, or updating one meal, make the final `db_query` select exactly that surviving row and include its `id`; the finish hook uses the verified row to add the dashboard link. After a delete or when no single meal is the subject, the final query must not return exactly one meal row. Do not add dashboard URLs or usage costs; the finish hook adds them.
