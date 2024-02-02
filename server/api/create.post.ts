import { PrismaClient, Prisma } from "@prisma/client";

const prisma = new PrismaClient();
export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const { playerId, roomId, finished, timeToAnswers, turn, playerInfo } = body;

    try {
        const newRoom = await prisma.rooms.create({
            data: {
                id: roomId,
                host: playerId,
                finished: false,
                playerLists: playerInfo,
            },
        });
        return { status: "Thanh cong" };
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return { status: "that bai", message: `Prisma Error : ${error.message}` };
        }
        return { message: error };
    }
});
