import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "../../generated/prisma/client.ts";

declare global {
    // eslint-disable-next-line no-var
    var prisma: PrismaClient | undefined;
}

const isPostgresUrl = (value: string | undefined) => value?.startsWith("postgres://") || value?.startsWith("postgresql://");
const connectionString = isPostgresUrl(process.env.DATABASE_URL) ? process.env.DATABASE_URL : process.env.DIRECT_URL;

if (!connectionString) {
    throw new Error("A PostgreSQL connection URL is not configured. Set DATABASE_URL or DIRECT_URL to a postgres:// URL.");
}

const adapter = new PrismaPg({ connectionString });

export const prisma = globalThis.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
    globalThis.prisma = prisma;
}

export { Prisma };
