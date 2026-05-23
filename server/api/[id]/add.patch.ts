import { Prisma, prisma } from "../../utils/prisma";

export default defineEventHandler(async (event) => {
    const id = event.context.params?.id;
    const body = await readBody(event);
    const nextPlayer = body.player;

    try {
        if (!nextPlayer?.id) {
            return { status: "error", message: "Missing player id" };
        }

        const room = await prisma.rooms.findUnique({
            where: {
                id,
            },
            select: {
                playerLists: true,
                kickedPlayers: true,
                maxHearts: true,
            },
        });
        const playerLists = (room?.playerLists ?? []) as any[];
        const playerHeart = Number(room?.maxHearts ?? 1);
        const normalizedNextPlayer = {
            ...nextPlayer,
            heart: [1, 3, 5].includes(playerHeart) ? playerHeart : 1,
        };

        if ((room?.kickedPlayers ?? []).includes(nextPlayer.id)) {
            return {
                status: "kicked",
                message: "Người chơi này đã bị xoá khỏi phòng.",
            };
        }

        const existingIndex = playerLists.findIndex((player) => player.id === nextPlayer.id);
        const nextPlayerLists =
            existingIndex >= 0
                ? playerLists.map((player, index) =>
                      index === existingIndex ? { ...player, ...normalizedNextPlayer } : player,
                  )
                : [...playerLists, normalizedNextPlayer];

        const addPlayer = await prisma.rooms.update({
            where: {
                id,
            },
            data: {
                playerLists: nextPlayerLists,
            },
        });
        return {
            status: existingIndex >= 0 ? "exists" : "success",
            room: addPlayer,
        };
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return { message: `Prisma Error : ${error.message}` };
        }
        return { error };
    }
});
