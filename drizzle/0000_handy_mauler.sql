CREATE EXTENSION IF NOT EXISTS pgcrypto;
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"channel" varchar(64) NOT NULL,
	"title" varchar(160) NOT NULL,
	"description" text,
	"icon" varchar(16),
	"tags" text[] DEFAULT ARRAY[]::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"search_document" tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('english', coalesce("description", '')), 'B') ||
    setweight(to_tsvector('english', array_to_string("tags", ' ')), 'C')
  ) STORED
);
--> statement-breakpoint
CREATE TABLE "project_api_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"key_hash" varchar(64) NOT NULL,
	"key_prefix" varchar(12) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"archived_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_api_keys" ADD CONSTRAINT "project_api_keys_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "events_project_created_idx" ON "events" USING btree ("project_id","created_at");--> statement-breakpoint
CREATE INDEX "events_channel_idx" ON "events" USING btree ("channel");--> statement-breakpoint
CREATE INDEX "events_search_idx" ON "events" USING gin ("search_document");--> statement-breakpoint
CREATE INDEX "project_api_keys_project_idx" ON "project_api_keys" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "project_api_keys_hash_idx" ON "project_api_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "projects_user_idx" ON "projects" USING btree ("user_id");--> statement-breakpoint
ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "project_api_keys" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "Users can view own projects"
  ON "projects"
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (auth.uid() = "user_id");--> statement-breakpoint
CREATE POLICY "Users can insert own projects"
  ON "projects"
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = "user_id");--> statement-breakpoint
CREATE POLICY "Users can update own projects"
  ON "projects"
  AS PERMISSIVE
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = "user_id")
  WITH CHECK (auth.uid() = "user_id");--> statement-breakpoint
CREATE POLICY "Users can view own api keys"
  ON "project_api_keys"
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "projects"
      WHERE "projects"."id" = "project_api_keys"."project_id"
        AND "projects"."user_id" = auth.uid()
    )
  );--> statement-breakpoint
CREATE POLICY "Users can manage own api keys"
  ON "project_api_keys"
  AS PERMISSIVE
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "projects"
      WHERE "projects"."id" = "project_api_keys"."project_id"
        AND "projects"."user_id" = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "projects"
      WHERE "projects"."id" = "project_api_keys"."project_id"
        AND "projects"."user_id" = auth.uid()
    )
  );--> statement-breakpoint
CREATE POLICY "Users can view own events"
  ON "events"
  AS PERMISSIVE
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM "projects"
      WHERE "projects"."id" = "events"."project_id"
        AND "projects"."user_id" = auth.uid()
    )
  );--> statement-breakpoint
CREATE POLICY "Users can insert own events"
  ON "events"
  AS PERMISSIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM "projects"
      WHERE "projects"."id" = "events"."project_id"
        AND "projects"."user_id" = auth.uid()
    )
  );--> statement-breakpoint
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE "events";
  EXCEPTION
    WHEN duplicate_object THEN NULL;
  END;
END $$;
