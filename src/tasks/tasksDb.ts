import { PrismaClient } from '@prisma/client';
import { config } from './config';

export const tasksDb = new PrismaClient({
	datasourceUrl: config.DATABASE_URL
})