import { PrismaClient, Prisma } from "@prisma/client";
const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
    const id = event.context.params?.id;
    const body = await readBody(event);
    // return body;

    try {
        const addPlayer = await prisma.rooms.update({
            where: {
                id,
            },
            data: {
                playerLists: body.player,
            },
        });
        return addPlayer;
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return { message: `Prisma Error : ${error.message}` };
        }
        return { error };
    }
});
