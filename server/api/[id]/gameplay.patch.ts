import pkg from "@prisma/client";
const { Prisma, PrismaClient } = pkg;
const prisma = new PrismaClient();
export default defineEventHandler(async (event) => {
    const id = event.context.params!.id;
    const body = await readBody(event);
    const query = getQuery(event);

    let data = {};
    const getListPlayers = await prisma.rooms.findFirst({
        where: {
            id,
        },
        select: {
            playerLists: true,
        },
    });
    const resetList = getListPlayers?.playerLists.map((player: any) => {
        return player.heart === 0 ? { ...player, heart: 1 } : player;
    });

    if (body.word) {
        Object.assign(data, {
            answerList: {
                push: body.word,
            },
            lastAnswers: body.word,
            startPlayer: body.startPlayer,
        });
    }

    if (body.playerId) {
        const updateList = getListPlayers?.playerLists.map((player: any) => {
            return player.id === body.playerId ? { ...player, heart: 0 } : player;
        });
        Object.assign(data, {
            playerLists: updateList,
        });
    }
    if (body.winner) {
        Object.assign(data, {
            winner: body.winner,
        });
    }
    if (body.player) {
        const removePlayer = getListPlayers?.playerLists.filter((person: any) => person.id !== body.player.id);

        Object.assign(data, {
            playerLists: removePlayer,
            startPlayer: body.startPlayer,
        });
    }

    if (body.reset) {
        Object.assign(data, {
            playerLists: resetList,
            lastAnswers: "",
            answerList: [],
            winner: null,
        });
    }

    if (body.clear) {
        Object.assign(data, {
            playerLists: resetList,
            lastAnswers: "",
            answerList: [],
            winner: null,
            active: false,
        });
    }
    try {
        const updateRooms = await prisma.rooms.update({
            where: {
                id,
            },
            data,
        });
        return {
            status: "success",
            updateRooms,
        };
    } catch (error) {
        if (error instanceof Prisma.PrismaClientValidationError) {
            return {
                status: "error",
                error,
            };
        }
        return {
            status: "error",
            error,
        };
    }
});
