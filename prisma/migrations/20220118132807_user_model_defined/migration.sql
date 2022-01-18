-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "auth_temp_secret" TEXT,
    "auth_secret" TEXT
);
