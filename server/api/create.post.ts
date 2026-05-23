import { Prisma, prisma } from "../utils/prisma";
export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const { playerId, roomId, name, image } = body;
    const hostName =
        typeof name === "string" && name.trim().length > 0
            ? name.trim()
            : `Player ${String(playerId).replace(/-/g, "").slice(0, 6).toUpperCase()}`;
    try {
        const newRoom = await prisma.rooms.create({
            data: {
                id: roomId,
                host: playerId,
                finished: false,
                active: false,
                maxHearts: 1,
                answerList: [],
                lastAnswers: "",
                hideHeart: false,
                playerLists: [
                    {
                        id: playerId,
                        name: hostName,
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
