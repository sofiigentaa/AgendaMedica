import { PrismaClient } from '@prisma/client';

// Single shared Prisma client for the process (avoids exhausting DB
// connections by creating a new client per request/module reload).
export const prisma = new PrismaClient();
