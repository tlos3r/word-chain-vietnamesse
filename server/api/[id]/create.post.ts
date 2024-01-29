import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { rooms } from "../../database/schema";
export default defineEventHandler(async (event) => {
    const connectionString = String(process.env.DATABASE_URL);
    const client = postgres(connectionString, { prepare: false });
    const db = drizzle(client);
    const body = await readBody(event);
    const { userId, roomId, finished, timeToAnswers, turn } = body;

    const newRoom = await db.insert(rooms).values({
        id: roomId,
        finished,
        host: userId,
        turn,
        timeToAnswers,
    });
    return newRoom;
});
