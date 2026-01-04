-- AlterTable
ALTER TABLE "AuditLog" ALTER COLUMN "entityId" TYPE TEXT USING "entityId"::text;

-- Add reason for traceability
ALTER TABLE "AuditLog" ADD COLUMN     "reason" TEXT;
