import { Prisma, prisma } from "../../utils/prisma";
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
            active: true,
            winner: true,
            host: true,
            timeToAnswer: true,
            maxHearts: true,
            playerLists: true,
            kickedPlayers: true,
            startPlayer: true,
            answerList: true,
            lastAnswers: true,
            giveUpMode: true,
        },
    });
    const roomMaxHearts = [1, 3, 5].includes(Number(getListPlayers?.maxHearts))
        ? Number(getListPlayers?.maxHearts)
        : 1;
    const resetList = getListPlayers?.playerLists.map((player: any) => {
        return { ...player, heart: roomMaxHearts };
    });
    const resetStartPlayer =
        resetList && resetList.length > 0
            ? {
                  ...resetList[Math.floor(Math.random() * resetList.length)],
                  turnStartedAt: new Date().toISOString(),
              }
            : null;

    const getRandomNextAnswer = async () => {
        const answeredWords = new Set([...(getListPlayers?.answerList ?? []), getListPlayers?.lastAnswers].filter(Boolean));
        const availableWords = await prisma.words.findMany({
            where: {
                name: {
                    notIn: Array.from(answeredWords),
                },
            },
            select: {
                name: true,
            },
        });
        const words = availableWords.length > 0 ? availableWords : await prisma.words.findMany({ select: { name: true } });

        if (words.length === 0) {
            return null;
        }

        return words[Math.floor(Math.random() * words.length)];
    };

    if (body.playerId) {
        const currentStartPlayer = getListPlayers?.startPlayer as any;

        if (
            body.turnStartedAt &&
            (!getListPlayers?.active ||
                getListPlayers?.winner ||
                currentStartPlayer?.id !== body.playerId ||
                currentStartPlayer?.turnStartedAt !== body.turnStartedAt)
        ) {
            return {
                status: "stale_turn",
            };
        }

        if (body.timeout) {
            const startedAt = Date.parse(currentStartPlayer?.turnStartedAt ?? "");
            const duration = Number(getListPlayers?.timeToAnswer ?? 0);

            if (Number.isFinite(startedAt) && duration > 0 && Date.now() - startedAt < duration * 1000) {
                return {
                    status: "turn_not_expired",
                };
            }
        }

        const playerLists = (getListPlayers?.playerLists ?? []) as any[];
        const currentPlayerIndex = playerLists.findIndex((player: any) => player.id === body.playerId);

        if (currentPlayerIndex === -1) {
            return {
                status: "error",
                error: "Player is not in this room.",
            };
        }

        const updateList = playerLists.map((player: any) => {
            if (player.id !== body.playerId) {
                return player;
            }

            const nextHeart = Math.max(Number(player.heart ?? 0) - 1, 0);
            return { ...player, heart: nextHeart };
        });
        const totalPlayerLeft = updateList.filter((player: any) => Number(player.heart ?? 0) > 0);

        Object.assign(data, {
            playerLists: updateList,
        });

        if (totalPlayerLeft.length === 1) {
            Object.assign(data, {
                winner: totalPlayerLeft[0],
            });
        }

        if (totalPlayerLeft.length > 1) {
            const shouldUseRandomWord = getListPlayers?.giveUpMode !== "blank";
            const randomWord = shouldUseRandomWord ? await getRandomNextAnswer() : null;
            const nextPlayer =
                updateList
                    .slice(currentPlayerIndex + 1)
                    .concat(updateList.slice(0, currentPlayerIndex + 1))
                    .find((player: any) => Number(player.heart ?? 0) > 0) ?? totalPlayerLeft[0];

            if (nextPlayer) {
                Object.assign(data, {
                    startPlayer: { ...nextPlayer, turnStartedAt: new Date().toISOString() },
                });
            }

            if (randomWord) {
                Object.assign(data, {
                    answerList: {
                        push: randomWord.name,
                    },
                    lastAnswers: randomWord.name,
                });
            }

            if (!shouldUseRandomWord) {
                Object.assign(data, {
                    lastAnswers: "",
                });
            }
        }
    }

    if (body.word && !body.playerId) {
        Object.assign(data, {
            answerList: {
                push: body.word,
            },
            lastAnswers: body.word,
            startPlayer: body.startPlayer ? { ...body.startPlayer, turnStartedAt: new Date().toISOString() } : body.startPlayer,
        });
    }

    if (body.displayName && body.userId) {
        const currentStartPlayer = getListPlayers?.startPlayer as any;
        const updateList = getListPlayers?.playerLists.map((player: any) => {
            return player.id === body.userId ? { ...player, name: body.displayName } : player;
        });
        Object.assign(data, {
            playerLists: updateList,
        });

        if (currentStartPlayer?.id === body.userId) {
            Object.assign(data, {
                startPlayer: {
                    ...currentStartPlayer,
                    name: body.displayName,
                },
            });
        }
    }
    if (body.winner) {
        Object.assign(data, {
            winner: body.winner,
        });
    }
    if (body.transferHost && body.userId) {
        const playerLists = (getListPlayers?.playerLists ?? []) as any[];
        const nextHost = playerLists.find(
            (player: any) => player.id === body.userId && !(getListPlayers?.kickedPlayers ?? []).includes(player.id),
        );

        if (!nextHost) {
            return {
                status: "error",
                error: "New host is not in this room.",
            };
        }

        Object.assign(data, {
            host: body.userId,
            playerLists: playerLists.map((player: any) => ({
                ...player,
                host: player.id === body.userId,
            })),
        });
    }

    if (body.player) {
        const playerLists = (getListPlayers?.playerLists ?? []) as any[];
        const removePlayer = playerLists.filter((person: any) => person.id !== body.player.id);
        const remainingActivePlayers = removePlayer.filter((person: any) => Number(person.heart ?? 0) > 0);
        const currentStartPlayer = getListPlayers?.startPlayer as any;
        const nextStartPlayer =
            currentStartPlayer?.id === body.player.id
                ? remainingActivePlayers[0]
                    ? { ...remainingActivePlayers[0], turnStartedAt: new Date().toISOString() }
                    : null
                : currentStartPlayer;
        const currentHost = getListPlayers?.host;
        const nextHost = currentHost === body.player.id ? removePlayer[0] : null;
        const nextHostId = nextHost?.id ?? currentHost ?? null;

        Object.assign(data, {
            kickedPlayers: {
                push: body.player.id,
            },
            playerLists: removePlayer.map((person: any) => ({
                ...person,
                host: person.id === nextHostId,
            })),
            startPlayer: nextStartPlayer,
            host: nextHostId,
        });
    }

    if (body.leavePlayer) {
        const playerLists = (getListPlayers?.playerLists ?? []) as any[];
        const removePlayer = playerLists.filter((person: any) => person.id !== body.leavePlayer.id);
        const remainingActivePlayers = removePlayer.filter((person: any) => Number(person.heart ?? 0) > 0);
        const currentStartPlayer = getListPlayers?.startPlayer as any;
        const nextStartPlayer =
            currentStartPlayer?.id === body.leavePlayer.id
                ? remainingActivePlayers[0]
                    ? { ...remainingActivePlayers[0], turnStartedAt: new Date().toISOString() }
                    : null
                : currentStartPlayer;
        const currentHost = getListPlayers?.host;
        const nextHost = currentHost === body.leavePlayer.id ? removePlayer[0] : null;
        const nextHostId = nextHost?.id ?? currentHost ?? null;

        Object.assign(data, {
            playerLists: removePlayer.map((person: any) => ({
                ...person,
                host: person.id === nextHostId,
            })),
            startPlayer: nextStartPlayer,
            host: nextHostId,
        });
    }

    if (body.reset) {
        Object.assign(data, {
            playerLists: resetList,
            lastAnswers: "",
            answerList: [],
            winner: null,
            active: true,
            startPlayer: resetStartPlayer,
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
