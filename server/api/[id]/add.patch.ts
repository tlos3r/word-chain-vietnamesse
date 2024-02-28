import pkg from "@prisma/client";
const { Prisma, PrismaClient } = pkg;
const prisma = new PrismaClient();

export default defineEventHandler(async (event) => {
    const id = event.context.params?.id;
    const body = await readBody(event);

    try {
        const addPlayer = await prisma.rooms.update({
            where: {
                id,
            },
            data: {
                playerLists: {
                    push: body.player,
                },
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
