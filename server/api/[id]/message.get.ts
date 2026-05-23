import { Prisma, prisma } from "../../utils/prisma";
export default defineEventHandler(async (event) => {
    const id = event.context.params!.id;
    try {
        const allMessages = await prisma.messages.findMany({
            where: {
                roomId: id,
            },
        });
        return allMessages;
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return { message: `Prisma Error : ${error.message}` };
        }
        return { error };
    }
});
