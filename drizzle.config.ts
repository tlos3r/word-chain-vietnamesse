import type { Config } from "drizzle-kit";
export default {
    schema: "./server/database/schema.ts",
    out: "./server/database/drizzle",
    driver: "pg",
    dbCredentials: {
        connectionString: String(process.env.DATABASE_URL),
    },
} satisfies Config;
