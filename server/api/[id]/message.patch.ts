import { PrismaClient, Prisma } from "@prisma/client";
const prisma = new PrismaClient();
export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const { userId, name, image, roomId, message } = body;
    try {
        const sendMessage = await prisma.messages.create({
            data: {
                userId,
                name,
                message,
                image,
                roomId,
            },
        });
        return sendMessage;
    } catch (error) {
        return error;
    }
});
