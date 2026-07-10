-- Explicit join table linking Services to StaffMembers that can perform them.
-- Before this migration, every staff member was implicitly capable of every
-- service; the backfill below preserves that behaviour for existing rows so no
-- staff becomes unbookable when the app starts filtering by capability.

CREATE TABLE "ServiceStaff" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "serviceId" TEXT NOT NULL,
    "staffMemberId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ServiceStaff_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ServiceStaff_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "StaffMember" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "ServiceStaff_serviceId_staffMemberId_key" ON "ServiceStaff"("serviceId", "staffMemberId");
CREATE INDEX "ServiceStaff_staffMemberId_idx" ON "ServiceStaff"("staffMemberId");

INSERT INTO "ServiceStaff" ("id", "serviceId", "staffMemberId", "createdAt")
SELECT
    lower(hex(randomblob(12))),
    "Service"."id",
    "StaffMember"."id",
    CURRENT_TIMESTAMP
FROM "Service"
INNER JOIN "StaffMember"
    ON "StaffMember"."businessId" = "Service"."businessId";
