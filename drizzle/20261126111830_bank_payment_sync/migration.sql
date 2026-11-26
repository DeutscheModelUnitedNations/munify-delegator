CREATE TYPE "bank_transfer_result" AS ENUM('RECEIVED', 'AMOUNT_MISMATCH', 'ALREADY_RECEIVED');--> statement-breakpoint
ALTER TYPE "administrative_status" ADD VALUE 'NEEDS_HUMAN_REVIEW';--> statement-breakpoint
CREATE TABLE "bank_transfer" (
	"id" text PRIMARY KEY,
	"created_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"external_id" integer NOT NULL,
	"payment_transaction_id" text NOT NULL,
	"amount" double precision NOT NULL,
	"booked_at" timestamp(3) NOT NULL,
	"result" "bank_transfer_result" NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "bank_transfer_external_id_payment_transaction_id_key" ON "bank_transfer" ("external_id","payment_transaction_id");--> statement-breakpoint
CREATE INDEX "bank_transfer_payment_transaction_id_idx" ON "bank_transfer" ("payment_transaction_id");--> statement-breakpoint
ALTER TABLE "bank_transfer" ADD CONSTRAINT "bank_transfer_BCZINrABbAJI_fkey" FOREIGN KEY ("payment_transaction_id") REFERENCES "payment_transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;