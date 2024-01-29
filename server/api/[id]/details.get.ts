import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "~/server/database/schema";

export default defineEventHandler(async (event) => {
    const connectionString = String(process.env.DATABASE_URL);
    const client = postgres(connectionString, { prepare: false });
    const db = drizzle(client, { schema });

    const detailsRoom = await db.query.rooms.findFirst();
    return detailsRoom;
});
