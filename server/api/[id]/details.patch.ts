import { Prisma, PrismaClient } from "@prisma/client/edge";
const prisma = new PrismaClient();
export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const id = event.context.params!.id;
    const { timeToAnswer, hideAnswer, active, startPlayer } = body;

    try {
        const updateRule = await prisma.rooms.update({
            where: {
                id,
            },
            data: {
                timeToAnswer,
                hideAnswer,
                active,
                startPlayer,
            },
        });
        return updateRule;
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return { message: `Prisma Error : ${error.message}` };
        }
        return { error };
    }
});
