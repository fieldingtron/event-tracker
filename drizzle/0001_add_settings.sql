CREATE TABLE IF NOT EXISTS "settings" (
	"id" varchar(16) PRIMARY KEY DEFAULT 'default' NOT NULL,
	"key_value" varchar(80) NOT NULL,
	"key_prefix" varchar(20) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
