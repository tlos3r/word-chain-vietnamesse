import pkg from "@prisma/client";
const { Prisma, PrismaClient } = pkg;
const prisma = new PrismaClient();
export default defineEventHandler(async (event) => {
    const id = event.context.params!.id;

    try {
        const detailsRoom = await prisma.rooms.findFirst({
            where: {
                id,
            },
        });
        return detailsRoom;
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return { message: `Prisma Error : ${error.message}` };
        }
        return { error };
    }
});
