import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { players } from "../../database/schema";

export default defineEventHandler(async (event) => {
    const connectionString = String(process.env.DATABASE_URL);
    const client = postgres(connectionString, { prepare: false });
    const db = drizzle(client);
    const body = await readBody(event);
    const newUser = await db.insert(players).values({
        userId: body.userId,
    });

    return newUser;
});
