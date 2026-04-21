CREATE TABLE "BusinessHoursDay" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "isClosed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "BusinessHoursDay_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "BusinessHoursDay_businessId_dayOfWeek_key" ON "BusinessHoursDay"("businessId", "dayOfWeek");

INSERT INTO "BusinessHoursDay" ("id", "businessId", "dayOfWeek", "isClosed", "createdAt", "updatedAt")
SELECT
    lower(hex(randomblob(16))),
    "Business"."id",
    "days"."dayOfWeek",
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM "BusinessHours"
            WHERE "BusinessHours"."businessId" = "Business"."id"
              AND "BusinessHours"."dayOfWeek" = "days"."dayOfWeek"
        ) THEN false
        ELSE true
    END,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "Business"
CROSS JOIN (
    SELECT 0 AS "dayOfWeek"
    UNION ALL SELECT 1
    UNION ALL SELECT 2
    UNION ALL SELECT 3
    UNION ALL SELECT 4
    UNION ALL SELECT 5
    UNION ALL SELECT 6
) AS "days";
