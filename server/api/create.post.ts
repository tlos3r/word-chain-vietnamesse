import { Prisma, PrismaClient } from "@prisma/client/edge";
const prisma = new PrismaClient();
export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const { playerId, roomId, name, image } = body;
    try {
        const newRoom = await prisma.rooms.create({
            data: {
                id: roomId,
                host: playerId,
                finished: false,
                active: false,
                playerLists: [
                    {
                        id: playerId,
                        name,
                        image,
                        host: true,
                        heart: 1,
                    },
                ],
            },
        });
        return newRoom;
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return { status: "that bai", message: `Prisma Error : ${error.message}` };
        }
        return { message: error };
    }
});
