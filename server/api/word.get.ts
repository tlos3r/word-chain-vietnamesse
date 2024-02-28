import { Prisma, PrismaClient } from "@prisma/client/edge";
const prisma = new PrismaClient();
export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    try {
        const findWords = await prisma.words.findFirstOrThrow({
            where: {
                name: String(query.s),
            },
        });
        return {
            status: "success",
            word: findWords,
        };
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return {
                status: "error",
                message: `Prisma Error : ${error.message}`,
            };
        }
        return {
            status: "error",
            error,
        };
    }
});
