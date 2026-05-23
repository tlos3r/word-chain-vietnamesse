import { Prisma, prisma } from "../../utils/prisma";
export default defineEventHandler(async (event) => {
    const id = event.context.params!.id;

    try {
        const detailsRoom = await prisma.rooms.findFirst({
            where: {
                id,
            },
        });
        const playerLists = (detailsRoom?.playerLists ?? []) as any[];
        const currentPlayer = playerLists.find((player) => player.id === (detailsRoom?.startPlayer as any)?.id);
        const turnStartedAt = Date.parse((detailsRoom?.startPlayer as any)?.turnStartedAt ?? "");

        if (detailsRoom?.active && !detailsRoom.winner && (!currentPlayer || !Number.isFinite(turnStartedAt))) {
            const fallbackPlayer = currentPlayer ?? playerLists.find((player) => Number(player.heart ?? 0) > 0);
            const startPlayer = fallbackPlayer
                ? {
                      ...fallbackPlayer,
                      turnStartedAt: Number.isFinite(turnStartedAt)
                          ? (detailsRoom.startPlayer as any).turnStartedAt
                          : new Date().toISOString(),
                  }
                : detailsRoom.startPlayer;

            if (startPlayer) {
                return await prisma.rooms.update({
                    where: {
                        id,
                    },
                    data: {
                        startPlayer,
                    },
                });
            }
        }

        return detailsRoom;
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return { message: `Prisma Error : ${error.message}` };
        }
        return { error };
    }
});
