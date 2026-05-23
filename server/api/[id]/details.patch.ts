import { Prisma, prisma } from "../../utils/prisma";
export default defineEventHandler(async (event) => {
    const body = await readBody(event);
    const id = event.context.params!.id;
    const { timeToAnswer, hideAnswer, hideHeart, giveUpMode, active, startPlayer } = body;
    const allowedMaxHearts = [1, 3, 5];
    const maxHearts = allowedMaxHearts.includes(Number(body.maxHearts)) ? Number(body.maxHearts) : 1;
    const currentRoom = await prisma.rooms.findUnique({
        where: {
            id,
        },
        select: {
            playerLists: true,
        },
    });
    const playerLists = ((currentRoom?.playerLists ?? []) as any[]).map((player) => ({
        ...player,
        heart: maxHearts,
    }));
    const selectedStartPlayer = startPlayer
        ? playerLists.find((player) => player.id === startPlayer.id) ?? { ...startPlayer, heart: maxHearts }
        : startPlayer;
    const nextStartPlayer = selectedStartPlayer
        ? { ...selectedStartPlayer, turnStartedAt: new Date().toISOString() }
        : selectedStartPlayer;

    try {
        const updateRule = await prisma.rooms.update({
            where: {
                id,
            },
            data: {
                timeToAnswer,
                maxHearts,
                hideAnswer,
                hideHeart,
                giveUpMode,
                active,
                playerLists,
                startPlayer: nextStartPlayer,
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
