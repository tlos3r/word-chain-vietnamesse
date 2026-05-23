import { Prisma, prisma } from "../../utils/prisma";
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
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return { message: `Prisma Error : ${error.message}` };
        }
        return { error };
    }
});
