PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;

CREATE TABLE "Customer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "email" TEXT,
    "image" TEXT,
    "authProvider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE "new_Appointment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "businessId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "staffMemberId" TEXT,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT NOT NULL,
    "customerPhone" TEXT,
    "guestFullName" TEXT,
    "guestEmail" TEXT,
    "guestPhone" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "bookingType" TEXT NOT NULL DEFAULT 'GUEST',
    "managementTokenHash" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "confirmationCode" TEXT NOT NULL,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Appointment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Appointment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Appointment_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Appointment_staffMemberId_fkey" FOREIGN KEY ("staffMemberId") REFERENCES "StaffMember" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Appointment" (
    "id",
    "businessId",
    "serviceId",
    "staffMemberId",
    "customerName",
    "customerEmail",
    "customerPhone",
    "guestFullName",
    "guestEmail",
    "guestPhone",
    "contactEmail",
    "contactPhone",
    "bookingType",
    "notes",
    "status",
    "confirmationCode",
    "startAt",
    "endAt",
    "createdAt",
    "updatedAt"
)
SELECT
    "id",
    "businessId",
    "serviceId",
    "staffMemberId",
    "customerName",
    "customerEmail",
    "customerPhone",
    "customerName",
    "customerEmail",
    "customerPhone",
    "customerEmail",
    "customerPhone",
    'GUEST',
    "notes",
    "status",
    "confirmationCode",
    "startAt",
    "endAt",
    "createdAt",
    "updatedAt"
FROM "Appointment";

DROP TABLE "Appointment";
ALTER TABLE "new_Appointment" RENAME TO "Appointment";

CREATE UNIQUE INDEX "Customer_authProvider_providerAccountId_key" ON "Customer"("authProvider", "providerAccountId");
CREATE INDEX "Customer_email_idx" ON "Customer"("email");

CREATE UNIQUE INDEX "Appointment_confirmationCode_key" ON "Appointment"("confirmationCode");
CREATE UNIQUE INDEX "Appointment_managementTokenHash_key" ON "Appointment"("managementTokenHash");
CREATE INDEX "Appointment_businessId_startAt_idx" ON "Appointment"("businessId", "startAt");
CREATE INDEX "Appointment_customerId_idx" ON "Appointment"("customerId");
CREATE INDEX "Appointment_staffMemberId_startAt_idx" ON "Appointment"("staffMemberId", "startAt");

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
