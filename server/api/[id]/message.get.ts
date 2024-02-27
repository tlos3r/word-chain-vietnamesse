import { PrismaClient, Prisma } from "@prisma/client";
const prisma = new PrismaClient();
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
        return error;
    }
});
