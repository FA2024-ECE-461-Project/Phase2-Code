CREATE TABLE IF NOT EXISTS "package_data" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"content" text,
	"url" varchar(255),
	"debloat" boolean DEFAULT false,
	"js_program" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "package_metadata" (
	"id" varchar(255) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"version" varchar(20) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "packages" (
	"metadata_id" varchar(255) NOT NULL,
	"data_id" varchar(255) NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "packages" ADD CONSTRAINT "packages_metadata_id_package_metadata_id_fk" FOREIGN KEY ("metadata_id") REFERENCES "public"."package_metadata"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "packages" ADD CONSTRAINT "packages_data_id_package_data_id_fk" FOREIGN KEY ("data_id") REFERENCES "public"."package_data"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
