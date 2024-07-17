-- CreateTable
CREATE TABLE "Conference" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "start" TIMESTAMP(3),
    "end" TIMESTAMP(3),
    "location" TEXT,
    "website" TEXT,
    "image" BYTEA,

    CONSTRAINT "Conference_pkey" PRIMARY KEY ("id")
);
