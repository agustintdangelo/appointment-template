PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_BusinessHours" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "openTime" TEXT NOT NULL,
    "closeTime" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BusinessHours_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "new_BusinessHours" ("id", "businessId", "dayOfWeek", "openTime", "closeTime", "createdAt", "updatedAt")
SELECT "id", "businessId", "dayOfWeek", "openTime", "closeTime", "createdAt", "updatedAt"
FROM "BusinessHours"
WHERE "isClosed" = 0;

DROP TABLE "BusinessHours";
ALTER TABLE "new_BusinessHours" RENAME TO "BusinessHours";

CREATE INDEX "BusinessHours_businessId_dayOfWeek_openTime_idx" ON "BusinessHours"("businessId", "dayOfWeek", "openTime");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
