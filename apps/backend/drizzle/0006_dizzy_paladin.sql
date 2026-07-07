CREATE TABLE "search_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"character_id" uuid NOT NULL,
	"searched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "search_events" ADD CONSTRAINT "search_events_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "search_events_searched_at_idx" ON "search_events" USING btree ("searched_at");--> statement-breakpoint
CREATE INDEX "search_events_character_searched_idx" ON "search_events" USING btree ("character_id","searched_at");