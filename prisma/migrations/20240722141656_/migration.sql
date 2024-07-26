-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "family_name" TEXT NOT NULL,
    "given_name" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "preferred_username" TEXT NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
