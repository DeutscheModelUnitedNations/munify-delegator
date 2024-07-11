import { privateConfig } from "$config/private";
import { PrismaClient } from "@prisma/client";

export const db = new PrismaClient({
  datasourceUrl: privateConfig.DATABASE_URL
});
