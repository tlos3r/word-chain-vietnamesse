import { Prisma, PrismaClient } from "@prisma/client/edge";

const prisma = new PrismaClient();
export default defineEventHandler(async (event) => {
    const totalWords = await prisma.words.count();
    let randomNumber = Math.floor(Math.random() * totalWords) + 1;
    try {
        const randomWord = await prisma.words.findFirstOrThrow({
            where: {
                id: randomNumber,
            },
        });
        return {
            status: "success",
            word: randomWord,
        };
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return { message: `Prisma Error : ${error.message}` };
        }
        return { error };
    }
});
