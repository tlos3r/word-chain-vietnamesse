<script lang="ts" setup>
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useStorage } from "@vueuse/core";
import { toast } from "vue3-toastify";
import type { words } from "~/generated/prisma/browser";
const route = useRoute();
useHead({
    title: `Phòng ${route.params.id}`,
});
definePageMeta({
    // middleware: ["auth"],
});
const client = useSupabaseClient();
let realtimeChannel: RealtimeChannel;
let stopTurnTimerWatch: (() => void) | null = null;
let stopAnswerDraftWatch: (() => void) | null = null;
let stopAnswerDraftKeyWatch: (() => void) | null = null;
const user = useSupabaseUser();
const anonymousPlayer = useAnonymousPlayer();
const loading = ref(false);
const loading2 = ref(false);
const joiningRoom = ref(false);
const transferringHost = ref(false);
const answer = ref("");
const errorMessage = ref("");
const displayName = ref("");
const isEditingDisplayName = ref(false);
const nameUpdateTimer = ref<ReturnType<typeof setTimeout> | null>(null);
const hostTransferTimer = ref<ReturnType<typeof setTimeout> | null>(null);
const gameplayNotification = ref<{ key: string; message: string; type: "warning" | "error" } | null>(null);

// copy code for invite everyone joining room
const source = ref(`${route.params.id}`);
const { text, copy, copied, isSupported } = useClipboard({ legacy: true, source });

/**
 * api call getting room info details
 * @returns Json
 */
const { data: roomInfo, refresh } = await useAsyncData<any>("roomInfo", () =>
    $fetch(`/api/${route.params.id}/details`, {
        headers: {
            "Content-type": "application/json",
        },
    }),
);
const roomExists = computed(() => Boolean(roomInfo.value?.id));

const options = useStorage("options", {
    hideListAnswer: false,
    hideHeart: false,
    timesToAnswer: 30,
    maxHearts: 1,
    giveUpMode: "random",
    sorted: false,
});
const heartOptions = [1, 3, 5];
const answerDrafts = useStorage<Record<string, string>>("answerDrafts", {});
const turnSecondsLeft = ref(0);
const turnTimer = ref<ReturnType<typeof setInterval> | null>(null);
const timedOutTurnKey = ref("");
const almostEndSoundTurnKey = ref("");
const gameplaySounds = useGameplaySounds();

const activeTurnPlayer = computed(() => {
    const startPlayerId = roomInfo.value?.startPlayer?.id;

    if (!startPlayerId) {
        return null;
    }

    return (
        roomInfo.value?.playerLists?.find((player: any) => player.id === startPlayerId) ?? roomInfo.value.startPlayer
    );
});

const normalizePlayerProfile = (profile: { id?: string; name?: string; image?: string } | null | undefined) => {
    const fallbackProfile = createAnonymousPlayerProfile(profile?.id);

    return {
        id: profile?.id || fallbackProfile.id,
        name: profile?.name?.trim() || fallbackProfile.name,
        image: profile?.image?.trim() || fallbackProfile.image,
    };
};

const persistAnonymousPlayer = (profile: { id: string; name: string; image: string }) => {
    if (
        anonymousPlayer.value?.id === profile.id &&
        anonymousPlayer.value.name === profile.name &&
        anonymousPlayer.value.image === profile.image
    ) {
        return;
    }

    anonymousPlayer.value = profile;
};

const currentUserId = computed(() => {
    return user.value?.id ?? anonymousPlayer.value?.id ?? null;
});

const isKicked = computed(() => {
    return Boolean(currentUserId.value && roomInfo.value?.kickedPlayers?.includes(currentUserId.value));
});

const currentUserProfile = computed(() => {
    if (user.value) {
        const profile = normalizePlayerProfile(usePlayerProfile(user.value));
        const storedProfile = anonymousPlayer.value;

        if (storedProfile?.id === profile.id) {
            profile.name = storedProfile.name?.trim() || profile.name;
            profile.image = storedProfile.image?.trim() || profile.image;
        }

        return profile;
    }

    return anonymousPlayer.value ? normalizePlayerProfile(anonymousPlayer.value) : null;
});

const rememberCurrentSupabaseUser = async () => {
    if (user.value) {
        const profile = normalizePlayerProfile(usePlayerProfile(user.value));
        const storedProfile = anonymousPlayer.value;

        if (storedProfile?.id === profile.id) {
            profile.name = storedProfile.name?.trim() || profile.name;
            profile.image = storedProfile.image?.trim() || profile.image;
        }

        if (profile.id) {
            persistAnonymousPlayer({
                id: profile.id,
                name: profile.name,
                image: profile.image,
            });
        }

        return;
    }

    const { data } = await client.auth.getUser();

    if (data.user) {
        const profile = normalizePlayerProfile(usePlayerProfile(data.user));
        const storedProfile = anonymousPlayer.value;

        if (storedProfile?.id === profile.id) {
            profile.name = storedProfile.name?.trim() || profile.name;
            profile.image = storedProfile.image?.trim() || profile.image;
        }

        if (profile.id) {
            persistAnonymousPlayer({
                id: profile.id,
                name: profile.name,
                image: profile.image,
            });
        }
    }
};

const isMyTurn = computed(() => {
    return (
        roomInfo.value?.active === true &&
        roomInfo.value?.winner == null &&
        currentUserId.value === activeTurnPlayer.value?.id
    );
});

const canResolveTimeout = computed(() => {
    return Boolean(currentUserId.value && roomInfo.value?.active && !roomInfo.value?.winner);
});

const currentTurnKey = computed(() => {
    if (!roomInfo.value?.active || roomInfo.value?.winner || !roomInfo.value?.startPlayer?.id) {
        return "";
    }

    return `${roomInfo.value.startPlayer.id}:${roomInfo.value.startPlayer.turnStartedAt ?? ""}:${roomInfo.value.lastAnswers ?? ""}:${roomInfo.value.answerList?.length ?? 0}`;
});

const currentAnswerDraftKey = computed(() => {
    if (!currentUserId.value || !currentTurnKey.value) {
        return "";
    }

    return `${route.params.id}:${currentUserId.value}:${currentTurnKey.value}`;
});
const getTurnDuration = () => {
    const duration = Number(roomInfo.value?.timeToAnswer ?? options.value.timesToAnswer);
    return Number.isFinite(duration) && duration > 0 ? duration : 0;
};

const getTurnSecondsLeft = () => {
    const duration = getTurnDuration();

    if (duration <= 0) {
        return 0;
    }

    const startedAt = Date.parse(roomInfo.value?.startPlayer?.turnStartedAt ?? "");

    if (!Number.isFinite(startedAt)) {
        return duration;
    }

    const elapsedSeconds = Math.floor((Date.now() - startedAt) / 1000);
    return Math.max(duration - elapsedSeconds, 0);
};

const turnProgressPercent = computed(() => {
    const duration = getTurnDuration();

    if (duration <= 0) {
        return 0;
    }

    return Math.max(0, Math.min(100, (turnSecondsLeft.value / duration) * 100));
});

const timerCircleStyle = computed(() => {
    const progress = turnProgressPercent.value;
    const activeColor = turnSecondsLeft.value <= 5 ? "oklch(var(--er))" : "oklch(var(--p))";

    return {
        background: `conic-gradient(from 360deg,${activeColor} ${progress}%, oklch(var(--b3)) 0)`,
    };
});

const clearTurnTimer = () => {
    if (turnTimer.value) {
        clearInterval(turnTimer.value);
        turnTimer.value = null;
    }
};

const startTurnTimer = () => {
    clearTurnTimer();

    if (!currentTurnKey.value) {
        turnSecondsLeft.value = 0;
        return;
    }

    const duration = getTurnDuration();

    if (duration <= 0) {
        turnSecondsLeft.value = 0;
        return;
    }

    const turnKey = currentTurnKey.value;
    turnSecondsLeft.value = getTurnSecondsLeft();
    const timer = setInterval(async () => {
        if (currentTurnKey.value !== turnKey) {
            clearInterval(timer);
            if (turnTimer.value === timer) {
                turnTimer.value = null;
            }
            return;
        }

        turnSecondsLeft.value = getTurnSecondsLeft();

        if (turnSecondsLeft.value > 0 && turnSecondsLeft.value <= 5 && almostEndSoundTurnKey.value !== turnKey) {
            almostEndSoundTurnKey.value = turnKey;
            gameplaySounds.play("timeAlmostEnd");
        }

        if (turnSecondsLeft.value <= 0) {
            clearInterval(timer);
            if (turnTimer.value === timer) {
                turnTimer.value = null;
            }

            if (!canResolveTimeout.value || timedOutTurnKey.value === turnKey) {
                return;
            }

            timedOutTurnKey.value = turnKey;
            errorMessage.value = "Het thoi gian tra loi";
            await giveUp(activeTurnPlayer.value?.id, roomInfo.value.startPlayer.turnStartedAt, true);
        }
    }, 1000);
    turnTimer.value = timer;
};

const clearCurrentAnswerDraft = () => {
    if (currentAnswerDraftKey.value) {
        delete answerDrafts.value[currentAnswerDraftKey.value];
    }
};

const restoreCurrentAnswerDraft = () => {
    if (!isMyTurn.value || !currentAnswerDraftKey.value) {
        return;
    }

    answer.value = answerDrafts.value[currentAnswerDraftKey.value] ?? "";
};

/**
 * Function handle starting game
 * @returns void
 */
const gameStart = async () => {
    loading.value = true;
    // PATCH fetch update infomation about room
    await $fetch(`/api/${route.params.id}/details`, {
        method: "PATCH",
        headers: {
            "Content-type": "application/json",
        },
        body: {
            timeToAnswer: options.value.timesToAnswer,
            maxHearts: options.value.maxHearts,
            hideAnswer: options.value.hideListAnswer,
            hideHeart: options.value.hideHeart,
            giveUpMode: options.value.giveUpMode,
            active: true,
            startPlayer: roomInfo.value.playerLists[0],
        },
        onRequestError({ request, options, error }) {
            console.error(request, options);
            useHandleError(error);
        },
    }).finally(async () => {
        loading.value = false;
        await refresh();
    });
};

/**
 * handle change new turn for player
 * @returns Promise<void>
 */
const updateNextPlayer = async (word: string, startPlayer: Object) => {
    await $fetch(`/api/${route.params.id}/gameplay`, {
        method: "PATCH",
        headers: {
            "Content-type": "application/json",
        },
        body: {
            word,
            startPlayer,
        },
    });
};

/**
 * update winner player
 * @param winner
 * @returns Promise
 */
const updateWinnerPlayer = async (winner: Object) => {
    await $fetch(`/api/${route.params.id}/gameplay`, {
        method: "PATCH",
        headers: {
            "Content-type": "application/json",
        },
        body: {
            winner,
        },
    });
};

/**
 * Handle remove player when they inactive
 * @param player
 * @returns Promise
 */
const removePlayer = async (player: { id: string; name: string; image: string; heart: number }) => {
    await $fetch(`/api/${route.params.id}/gameplay`, {
        method: "PATCH",
        headers: {
            "Content-type": "application/json",
        },
        body: {
            player,
        },
    });
    refresh();
};

/**
 * Validation input answer about word
 * @returns Promise
 */
const submitAnswer = async () => {
    loading.value = true;
    const normalizedAnswer = answer.value.trim();
    // get first letter
    const getFirstWord = normalizedAnswer.split(" ").shift();
    let getPlayerListLeft = roomInfo.value.playerLists.filter((player: any) => Number(player.heart ?? 0) > 0);
    let nextPlayerIndex =
        getPlayerListLeft.map((player: { name: any }) => player.name).indexOf(roomInfo.value.startPlayer.name) + 1;
    if (normalizedAnswer.length === 0) {
        errorMessage.value = "Đã nhập từ chó nào đâu mà ấn enter làm gì";
        loading.value = false;
        return;
    }
    if (nextPlayerIndex === getPlayerListLeft.length) {
        nextPlayerIndex = 0;
    }

    const usedAnswer = roomInfo.value.answerList.some(
        (word: string) => word.trim().toLowerCase() === normalizedAnswer.toLowerCase(),
    );

    if (usedAnswer) {
        errorMessage.value = `Từ ${usedAnswer} đã được dùng trước đó`;
        loading.value = false;
        return;
    }

    const { data } = await useFetch<words>("/api/word", {
        params: {
            s: normalizedAnswer,
        },
        headers: {
            "Content-type": "application/json",
        },
        onResponse({ response }) {
            if (response._data.status === "success") {
                if (roomInfo.value.lastAnswers.length === 0) {
                    clearTurnTimer();
                    clearCurrentAnswerDraft();
                    updateNextPlayer(response._data.word.name, getPlayerListLeft[nextPlayerIndex]);
                    answer.value = "";
                    errorMessage.value = "";
                    loading.value = false;
                    return;
                }

                if (
                    roomInfo.value.lastAnswers.length > 0 &&
                    roomInfo.value.lastAnswers.split(" ").pop() === getFirstWord
                ) {
                    clearTurnTimer();
                    clearCurrentAnswerDraft();
                    updateNextPlayer(response._data.word.name, getPlayerListLeft[nextPlayerIndex]);
                    errorMessage.value = "";
                    answer.value = "";
                } else if (roomInfo.value.lastAnswers.split(" ").pop() !== getFirstWord) {
                    errorMessage.value = `Từ ${getFirstWord} không trùng với từ cuối trước đó là ${roomInfo.value.lastAnswers
                        .split(" ")
                        .pop()}`;
                }
            } else {
                errorMessage.value = `Từ ${normalizedAnswer} không tồn tại.`;
            }
        },
        onResponseError({ error }) {
            useHandleError(error);
        },
    });
    loading.value = false;
};
/**
 * Handle event when player want to give up
 * @returns Promise
 */
const giveUp = async (
    playerId: string | Event | null = currentUserId.value,
    turnStartedAt = roomInfo.value?.startPlayer?.turnStartedAt,
    timeout = false,
) => {
    const nextPlayerId = typeof playerId === "string" ? playerId : currentUserId.value;

    if (loading2.value || !nextPlayerId) {
        return;
    }

    loading2.value = true;
    clearTurnTimer();

    try {
        await $fetch(`/api/${route.params.id}/gameplay`, {
            method: "PATCH",
            headers: {
                "Content-type": "application/json",
            },
            body: {
                playerId: nextPlayerId,
                turnStartedAt,
                timeout,
            },
            onResponse({ response }) {
                if (response._data.status === "success") {
                    refresh();
                } else if (response._data.status === "stale_turn" || response._data.status === "turn_not_expired") {
                    refresh();
                } else {
                    toast.error(`${response._data.error}`);
                }
            },
            onResponseError({ error }) {
                useHandleError(error);
            },
        });
        clearCurrentAnswerDraft();
        answer.value = "";
        errorMessage.value = "";
    } finally {
        loading2.value = false;
    }
};
/**
 * handle start a new exists game
 * @returns Promise<void>
 */
const playAgain = async () => {
    await $fetch(`/api/${route.params.id}/gameplay`, {
        method: "PATCH",
        headers: {
            "Content-type": "application/json",
        },
        body: {
            reset: true,
        },
    });
    refresh();
};

const playerHeartMap = (players: any[] = []) => {
    return players.reduce<Record<string, number>>((result, player) => {
        result[player.id] = Number(player.heart);
        return result;
    }, {});
};

const syncGameplayNotifications = (nextRoom: any, previousRoom: any) => {
    if (!nextRoom?.active || !previousRoom?.playerLists || !nextRoom?.playerLists) {
        return;
    }

    const previousHearts = playerHeartMap(previousRoom.playerLists);
    const changedPlayer = nextRoom.playerLists.find((player: any) => {
        const previousHeart = previousHearts[player.id];

        return previousHeart !== undefined && Number(player.heart ?? 0) < previousHeart;
    });

    if (!changedPlayer) {
        return;
    }

    const previousHeart = previousHearts[changedPlayer.id];
    const nextHeart = Number(changedPlayer.heart ?? 0);
    const notificationKey = `${changedPlayer.id}:${previousHeart}:${nextHeart}:${nextRoom.startPlayer?.turnStartedAt ?? ""}`;

    if (gameplayNotification.value?.key === notificationKey) {
        return;
    }

    gameplayNotification.value =
        nextHeart <= 0
            ? {
                  key: notificationKey,
                  message: `Người chơi ${changedPlayer.name} đã hết mạng và thua cuộc`,
                  type: "error",
              }
            : {
                  key: notificationKey,
                  message: `Người chơi ${changedPlayer.name} đã bỏ qua lượt này`,
                  type: "warning",
              };

    if (gameplayNotification.value.type === "error") {
        toast.error(gameplayNotification.value.message);
        return;
    }

    toast.warning(gameplayNotification.value.message);
};

const syncGameplaySounds = (nextRoom: any, previousRoom: any) => {
    if (!import.meta.client || !nextRoom || !previousRoom) {
        return;
    }

    const nextTurnKey = nextRoom.active && !nextRoom.winner ? currentTurnKey.value : "";
    const previousTurnStartedAt = previousRoom.startPlayer?.turnStartedAt ?? "";
    const nextTurnStartedAt = nextRoom.startPlayer?.turnStartedAt ?? "";
    const previousPlayerId = previousRoom.startPlayer?.id ?? "";
    const nextPlayerId = nextRoom.startPlayer?.id ?? "";

    if (nextTurnKey && (previousTurnStartedAt !== nextTurnStartedAt || previousPlayerId !== nextPlayerId)) {
        almostEndSoundTurnKey.value = "";

        if (previousRoom.active) {
            gameplaySounds.play("nextPlayer");
        }

        gameplaySounds.play("timeStart");
    }

    const previousHearts = playerHeartMap(previousRoom.playerLists);
    const hasNewLoser = nextRoom.playerLists?.some(
        (player: any) => previousHearts[player.id] === 1 && player.heart === 0,
    );

    if (hasNewLoser) {
        gameplaySounds.play("playerLost");
    }

    if (!previousRoom.winner && nextRoom.winner) {
        gameplaySounds.play("winner");
    }
};

const syncGameplayFeedback = (nextRoom: any, previousRoom: any) => {
    syncGameplayNotifications(nextRoom, previousRoom);
    syncGameplaySounds(nextRoom, previousRoom);
};
/**
 * handle go back to waiting room
 * @returns Promise<void>
 */
const goBack = async () => {
    await $fetch(`/api/${route.params.id}/gameplay`, {
        method: "PATCH",
        headers: {
            "Content-type": "application/json",
        },
        body: {
            clear: true,
        },
    });
};

const currentPlayer = computed(() => {
    return roomInfo.value?.playerLists?.find((player: any) => player.id === currentUserId.value);
});

const isHost = computed(() => {
    return currentUserId.value === roomInfo.value?.host || currentPlayer.value?.host === true;
});

const syncDisplayName = () => {
    if (isEditingDisplayName.value) {
        return;
    }

    if (currentPlayer.value?.name && currentPlayer.value.name !== displayName.value) {
        displayName.value = currentPlayer.value.name;
        return;
    }

    if (!displayName.value && currentUserProfile.value?.name) {
        displayName.value = currentUserProfile.value.name;
    }
};

const syncRoomOptions = () => {
    if (!roomInfo.value) {
        return;
    }

    options.value.hideListAnswer = Boolean(roomInfo.value.hideAnswer ?? options.value.hideListAnswer);
    options.value.hideHeart = Boolean(roomInfo.value.hideHeart ?? options.value.hideHeart);
    options.value.timesToAnswer = Number(roomInfo.value.timeToAnswer ?? options.value.timesToAnswer);
    options.value.maxHearts = heartOptions.includes(Number(roomInfo.value.maxHearts))
        ? Number(roomInfo.value.maxHearts)
        : options.value.maxHearts;
    options.value.giveUpMode = roomInfo.value.giveUpMode ?? options.value.giveUpMode;
};

const updateRoomMaxHearts = async () => {
    if (!isHost.value || roomInfo.value?.active !== false) {
        return;
    }

    const maxHearts = heartOptions.includes(Number(options.value.maxHearts)) ? Number(options.value.maxHearts) : 1;

    await $fetch(`/api/${route.params.id}/details`, {
        method: "PATCH",
        headers: {
            "Content-type": "application/json",
        },
        body: {
            timeToAnswer: options.value.timesToAnswer,
            maxHearts,
            hideAnswer: options.value.hideListAnswer,
            hideHeart: options.value.hideHeart,
            giveUpMode: options.value.giveUpMode,
            active: false,
            startPlayer: roomInfo.value.startPlayer,
        },
    });
    await refresh();
};

const updateDisplayName = async () => {
    const nextName = displayName.value.trim();

    if (!roomExists.value || !currentUserId.value || nextName.length === 0 || nextName === currentPlayer.value?.name) {
        isEditingDisplayName.value = false;
        return;
    }

    await $fetch(`/api/${route.params.id}/gameplay`, {
        method: "PATCH",
        headers: {
            "Content-type": "application/json",
        },
        body: {
            userId: currentUserId.value,
            displayName: nextName,
        },
    });
    if (anonymousPlayer.value && anonymousPlayer.value.id === currentUserId.value) {
        anonymousPlayer.value = {
            ...anonymousPlayer.value,
            name: nextName,
        };
    }
    isEditingDisplayName.value = false;
    refresh();
};

const joinCurrentUserToRoom = async () => {
    if (!roomExists.value || isKicked.value || !currentUserId.value || !currentUserProfile.value || joiningRoom.value) {
        return;
    }

    const result = roomInfo.value.playerLists.some((player: any) => player.id === currentUserId.value);

    if (!result) {
        const profile = currentUserProfile.value;
        joiningRoom.value = true;

        try {
            const response: any = await $fetch(`/api/${String(route.params.id)}/add`, {
                method: "PATCH",
                body: {
                    player: {
                        id: currentUserId.value,
                        name: profile.name,
                        image: profile.image,
                        heart: 1,
                    },
                },
            });
            if (response.status === "kicked") {
                await refresh();
                return;
            }
            refresh();
        } finally {
            joiningRoom.value = false;
        }
    }
};

const transferHostIfNeeded = async (onlinePlayerIds: string[]) => {
    if (!roomInfo.value?.host || !currentUserId.value || transferringHost.value) {
        return;
    }

    const currentPlayerIds = roomInfo.value.playerLists.map((player: any) => player.id);
    const kickedPlayerIds = roomInfo.value.kickedPlayers ?? [];

    if (!currentPlayerIds.includes(currentUserId.value) || kickedPlayerIds.includes(currentUserId.value)) {
        return;
    }

    if (onlinePlayerIds.includes(roomInfo.value.host)) {
        return;
    }

    const eligibleOnlinePlayerIds = onlinePlayerIds.filter(
        (playerId) => currentPlayerIds.includes(playerId) && !kickedPlayerIds.includes(playerId),
    );
    const nextHost = roomInfo.value.playerLists.find((player: any) => eligibleOnlinePlayerIds.includes(player.id));

    if (!nextHost || nextHost.id !== currentUserId.value) {
        return;
    }

    transferringHost.value = true;
    try {
        await $fetch(`/api/${route.params.id}/gameplay`, {
            method: "PATCH",
            headers: {
                "Content-type": "application/json",
            },
            body: {
                transferHost: true,
                userId: currentUserId.value,
            },
        });
        await refresh();
    } finally {
        transferringHost.value = false;
    }
};

const scheduleHostTransferIfNeeded = (onlinePlayerIds: string[]) => {
    if (hostTransferTimer.value) {
        clearTimeout(hostTransferTimer.value);
        hostTransferTimer.value = null;
    }

    if (!roomInfo.value?.host || onlinePlayerIds.includes(roomInfo.value.host)) {
        return;
    }

    const currentPlayerIds = roomInfo.value.playerLists.map((player: any) => player.id);

    if (!currentUserId.value || !currentPlayerIds.includes(currentUserId.value)) {
        return;
    }

    hostTransferTimer.value = setTimeout(() => {
        const state = realtimeChannel.presenceState();
        const latestOnlinePlayerIds = Object.values(state)
            .flat()
            .map((presence: any) => presence.userId)
            .filter(Boolean);

        transferHostIfNeeded(latestOnlinePlayerIds);
    }, 2000);
};

onMounted(async () => {
    await rememberCurrentSupabaseUser();
    await joinCurrentUserToRoom();
});

watch([roomInfo, user, anonymousPlayer], joinCurrentUserToRoom);
watch(roomInfo, syncGameplayFeedback);
watch(user, rememberCurrentSupabaseUser);
onMounted(syncDisplayName);
watch(roomInfo, syncRoomOptions, { immediate: true });
watch(currentPlayer, syncDisplayName, { immediate: true });
watch(currentUserProfile, syncDisplayName, { immediate: true });
watch(
    () => options.value.maxHearts,
    (nextMaxHearts, previousMaxHearts) => {
        if (nextMaxHearts === previousMaxHearts || Number(roomInfo.value?.maxHearts) === Number(nextMaxHearts)) {
            return;
        }

        updateRoomMaxHearts();
    },
);
watch(
    () => options.value.hideHeart,
    (nextHideHeart, previousHideHeart) => {
        if (nextHideHeart === previousHideHeart || Boolean(roomInfo.value?.hideHeart) === Boolean(nextHideHeart)) {
            return;
        }

        updateRoomMaxHearts();
    },
);
watch(displayName, () => {
    if (!currentUserId.value || displayName.value === currentPlayer.value?.name) {
        return;
    }

    isEditingDisplayName.value = true;
    if (nameUpdateTimer.value) {
        clearTimeout(nameUpdateTimer.value);
    }
    nameUpdateTimer.value = setTimeout(updateDisplayName, 500);
});
onMounted(() => {
    startTurnTimer();
    stopTurnTimerWatch = watch([canResolveTimeout, currentTurnKey], startTurnTimer);
    restoreCurrentAnswerDraft();
    stopAnswerDraftKeyWatch = watch([currentAnswerDraftKey, isMyTurn], restoreCurrentAnswerDraft);
    stopAnswerDraftWatch = watch(answer, (value) => {
        if (!isMyTurn.value || !currentAnswerDraftKey.value) {
            return;
        }

        answerDrafts.value[currentAnswerDraftKey.value] = value;
    });

    // Real time listener for new workouts
    realtimeChannel = client
        .channel(`${route.params.id}`, {
            config: {
                presence: {
                    key: currentUserId.value ?? `guest-${Date.now()}`,
                },
            },
        })
        .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, (payload: any) => {
            const nextRoom = payload.new;
            const nextStartPlayer = nextRoom?.startPlayer;
            const currentStartPlayer = roomInfo.value?.startPlayer;
            const turnChanged =
                nextStartPlayer?.id !== currentStartPlayer?.id ||
                nextStartPlayer?.turnStartedAt !== currentStartPlayer?.turnStartedAt;

            if (nextRoom?.winner || turnChanged) {
                clearTurnTimer();
            }

            refresh();
        })
        .on("presence", { event: "sync" }, () => {
            const state = realtimeChannel.presenceState();
            const onlinePlayerIds = Object.values(state)
                .flat()
                .map((presence: any) => presence.userId)
                .filter(Boolean);

            scheduleHostTransferIfNeeded(onlinePlayerIds);
        });
    realtimeChannel.subscribe((status) => {
        if (status !== "SUBSCRIBED" || !currentUserId.value) {
            return;
        }

        realtimeChannel.track({
            userId: currentUserId.value,
        });
    });
});

onUnmounted(() => {
    stopTurnTimerWatch?.();
    stopTurnTimerWatch = null;
    stopAnswerDraftWatch?.();
    stopAnswerDraftWatch = null;
    stopAnswerDraftKeyWatch?.();
    stopAnswerDraftKeyWatch = null;
    clearTurnTimer();
    if (nameUpdateTimer.value) {
        clearTimeout(nameUpdateTimer.value);
    }
    if (hostTransferTimer.value) {
        clearTimeout(hostTransferTimer.value);
    }
    client.removeChannel(realtimeChannel);
});
</script>

<template>
    <div class="container min-h-screen px-4 py-5 sm:px-6">
        <div v-if="!roomExists" class="flex items-center justify-center min-h-screen">
            <div class="text-center">
                <p class="mb-4 text-xl font-bold text-error">Phòng không tồn tại</p>
                <NuxtLink to="/" class="btn btn-primary text-primary-content">Quay lại trang chủ</NuxtLink>
            </div>
        </div>

        <div v-else-if="isKicked" class="flex items-center justify-center min-h-screen">
            <div class="text-center">
                <p class="mb-4 text-xl font-bold text-error">Bạn đã bị chủ phòng mời khỏi phòng này</p>
                <NuxtLink to="/" class="btn btn-primary text-primary-content">Quay lại trang chủ</NuxtLink>
            </div>
        </div>

        <!-- Waiting Room -->
        <div
            v-else-if="roomInfo.active == false"
            class="grid gap-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)] xl:gap-8"
        >
            <div class="space-y-4">
                <div
                    class="flex flex-col gap-3 p-4 rounded-md bg-base-200 sm:flex-row sm:items-center sm:justify-between"
                >
                    <p class="text-lg font-bold sm:text-xl">
                        Mã phòng :
                        <code class="p-2 font-mono tracking-widest rounded-xl bg-neutral text-neutral-content">{{
                            $route.params.id
                        }}</code>
                    </p>
                    <button @click="copy(source)" class="btn btn-neutral text-neutral-content btn-md sm:btn-square">
                        <span v-if="!copied"><Icon name="gravity-ui:copy-xmark" class="text-xl" /></span>
                        <span v-else><Icon name="gravity-ui:copy-check" class="text-xl" /></span>
                    </button>
                </div>
                <div class="p-4 rounded-md bg-base-200">
                    <label class="w-full form-control">
                        <div class="label">
                            <span class="label-text">Tên hiển thị</span>
                        </div>
                        <input
                            v-model="displayName"
                            type="text"
                            maxlength="32"
                            class="w-full input input-bordered"
                            placeholder="Nhập tên của bạn"
                            @focus="isEditingDisplayName = true"
                            @blur="updateDisplayName"
                            @keyup.enter="updateDisplayName"
                        />
                    </label>
                </div>
                <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <div
                        v-if="roomInfo.playerLists.length >= 1"
                        v-for="player in roomInfo.playerLists"
                        class="p-4 rounded-md shadow-sm bg-base-200 text-base-content"
                        :key="player.id"
                    >
                        <div class="flex items-center gap-4">
                            <div class="avatar">
                                <div class="rounded-md w-14 sm:w-16">
                                    <img :src="player.image" />
                                    <Icon
                                        v-if="player.host"
                                        name="mdi:crown"
                                        class="absolute text-2xl text-yellow-400 -right-3 -top-3 sm:text-3xl"
                                    />
                                </div>
                            </div>
                            <div class="min-w-0 text-lg sm:text-xl">
                                <p class="font-bold truncate">
                                    <span> {{ player.name }}</span>
                                    <span v-if="currentUserId == player.id"> (bạn)</span>
                                </p>
                                <p class="text-sm opacity-70">Heart: {{ player.heart }}</p>
                            </div>
                        </div>
                    </div>
                    <div v-else class="text-error">Phòng không tồn tại</div>
                </div>
            </div>
            <div class="space-y-5">
                <div v-if="isHost" class="flex flex-col p-4 rounded-md bg-base-200 sm:p-5">
                    <p class="mb-2 text-2xl font-bold sm:text-3xl">Cài đặt</p>
                    <div class="form-control">
                        <label class="cursor-pointer label">
                            <span class="text-base font-medium sm:text-xl">Ẩn danh sách từ đã trả lời</span>
                            <input v-model="options.hideListAnswer" type="checkbox" class="toggle toggle-primary" />
                        </label>
                    </div>

                    <div class="form-control">
                        <label class="cursor-pointer label">
                            <span class="text-base font-medium sm:text-xl">An so mang trong phong choi</span>
                            <input v-model="options.hideHeart" type="checkbox" class="toggle toggle-primary" />
                        </label>
                    </div>

                    <div class="form-control">
                        <label class="label" for="time-to-answer">
                            <span class="text-base font-medium sm:text-xl">Thời gian trả lời</span>
                            <span class="label-text-alt">{{ options.timesToAnswer }} giây</span>
                        </label>
                        <input
                            id="time-to-answer"
                            v-model.number="options.timesToAnswer"
                            type="number"
                            min="5"
                            max="300"
                            step="5"
                            class="input input-bordered"
                        />
                    </div>

                    <div class="mt-4 form-control">
                        <div class="label">
                            <span class="text-base font-medium sm:text-xl">So mang moi nguoi</span>
                        </div>
                        <div class="join">
                            <input
                                v-for="heartOption in heartOptions"
                                :key="heartOption"
                                v-model.number="options.maxHearts"
                                type="radio"
                                name="max-hearts"
                                :value="heartOption"
                                class="flex-1 join-item btn"
                                :aria-label="`${heartOption}`"
                            />
                        </div>
                    </div>

                    <div class="mt-4 form-control">
                        <div class="label">
                            <span class="text-base font-medium sm:text-xl">Khi người chơi bỏ cuộc</span>
                        </div>
                        <label class="justify-start gap-3 cursor-pointer label">
                            <input
                                v-model="options.giveUpMode"
                                type="radio"
                                value="random"
                                class="radio radio-primary"
                                checked
                            />
                            <span class="label-text">Tạo từ mới ngẫu nhiên (khó)</span>
                        </label>
                        <label class="justify-start gap-3 cursor-pointer label">
                            <input
                                v-model="options.giveUpMode"
                                type="radio"
                                value="blank"
                                class="radio radio-primary"
                            />
                            <span class="label-text">Để trống</span>
                        </label>
                    </div>

                    <button
                        type="button"
                        class="mt-4 btn btn-neutral text-neutral-content"
                        onclick="waitingKickPlayer.showModal()"
                    >
                        Đuổi người chơi
                    </button>
                    <dialog id="waitingKickPlayer" class="modal modal-top sm:modal-middle">
                        <div class="modal-box">
                            <h3 class="text-lg font-bold">Danh sách người chơi</h3>
                            <div
                                v-for="player in roomInfo.playerLists"
                                :key="player.id"
                                class="flex items-center gap-4 my-3"
                            >
                                <div class="avatar">
                                    <div class="w-10 rounded-md">
                                        <img :src="player.image" />
                                    </div>
                                </div>
                                <p class="flex-1 min-w-0 font-bold truncate">
                                    {{ player.name }}
                                </p>
                                <button
                                    v-show="!player.host"
                                    class="text-xl btn btn-sm btn-error text-error-content"
                                    @click="removePlayer(player)"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                        <form method="dialog" class="modal-backdrop">
                            <button>close</button>
                        </form>
                    </dialog>

                    <button
                        type="button"
                        class="mt-5 text-lg btn btn-primary text-primary-content sm:text-xl"
                        :class="{ 'btn-disabled': roomInfo.playerLists.length === 1 }"
                        @click="gameStart"
                    >
                        <span v-if="loading" class="loading loading-dots loading-md"></span>
                        <span v-else>Bắt đầu</span>
                    </button>
                </div>
                <div v-else class="flex flex-col p-5 rounded-md bg-base-200">
                    <p class="text-lg font-bold text-center sm:text-xl">Đợi chủ phòng bắt đầu trò chơi...</p>
                </div>
                <RoomChat />
            </div>
        </div>

        <!-- Starting RoomPlay -->
        <div v-else-if="roomInfo.active == true && roomInfo.winner == null" class="pb-8">
            <div class="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] xl:gap-8">
                <div>
                    <div class="relative flex flex-col">
                        <div
                            class="relative w-full p-4 rounded-md min-h-80 bg-base-200 text-primary-content sm:min-h-64 sm:p-6"
                        >
                            <div
                                v-if="turnSecondsLeft > 0"
                                class="absolute flex items-center justify-center w-16 h-16 p-1 rounded-full shadow-md right-3 top-3 sm:right-4 sm:top-4 sm:h-20 sm:w-20"
                                :class="{ 'text-error': turnSecondsLeft <= 5 }"
                                :style="timerCircleStyle"
                            >
                                <div
                                    class="flex flex-col items-center justify-center w-full h-full rounded-full bg-base-100 text-base-content"
                                >
                                    <Icon name="mdi:clock-outline" class="text-base sm:text-xl" />
                                    <span class="text-xl font-bold leading-none sm:text-2xl">{{
                                        turnSecondsLeft
                                    }}</span>
                                    <span class="text-xs leading-none">giay</span>
                                </div>
                            </div>
                            <div
                                class="flex flex-col justify-center gap-5 pr-16 min-h-64 text-base-content sm:items-center sm:pr-24 sm:text-center"
                            >
                                <p class="font-bold break-words">
                                    Từ đã trả lời trước đó : <b class="text-secondary">{{ roomInfo.lastAnswers }}</b>
                                </p>
                                <p class="text-lg font-bold sm:text-xl">
                                    Đến lượt của
                                    <span v-if="isMyTurn">bạn</span>
                                    <span v-else class="text-primary">{{ activeTurnPlayer?.name }}</span>
                                </p>
                                <div
                                    class="flex flex-col w-full gap-3 sm:max-w-2xl sm:flex-row sm:items-start"
                                    v-show="isMyTurn"
                                >
                                    <label class="w-full form-control sm:flex-1">
                                        <input
                                            type="text"
                                            placeholder="Trả lời ở đây nhé"
                                            class="w-full input input-bordered text-base-content"
                                            v-model="answer"
                                            @keyup.enter="submitAnswer"
                                            autofocus
                                        />
                                        <div class="label">
                                            <span class="label-text-alt text-error" v-show="errorMessage.length > 0">{{
                                                errorMessage
                                            }}</span>
                                        </div>
                                    </label>
                                    <button
                                        class="btn btn-primary text-primary-content sm:w-28"
                                        @click="submitAnswer"
                                        :class="{ 'btn-disabled': answer.length === 0 }"
                                    >
                                        <span v-if="loading" class="loading loading-dots loading-md"></span>
                                        <span v-else>Xác nhận</span>
                                    </button>
                                    <button
                                        class="btn btn-secondary text-secondary-content sm:w-28"
                                        v-if="roomInfo.answerList.length > 0"
                                        @click="giveUp()"
                                    >
                                        <span v-if="loading2" class="loading loading-dots loading-md"></span>
                                        <span v-else>Bỏ cuộc</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div
                            class="flex w-full gap-3 pb-2 mt-5 overflow-x-auto lg:grid lg:grid-cols-3 lg:overflow-visible xl:grid-cols-4"
                        >
                            <div
                                v-if="roomInfo.playerLists.length >= 1"
                                v-for="player in roomInfo.playerLists"
                                class="p-3 rounded-md shadow-sm min-w-52 bg-base-200 text-base-content lg:min-w-0"
                                :key="player.id"
                            >
                                <div class="flex items-center gap-4">
                                    <div class="avatar">
                                        <div class="w-12 rounded-md sm:w-14">
                                            <img :src="player.image" :class="{ grayscale: player.heart === 0 }" />
                                        </div>
                                        <Icon
                                            v-if="player.host"
                                            name="mdi:crown"
                                            class="absolute text-2xl text-yellow-400 -right-3 -top-3"
                                        />
                                    </div>
                                    <div class="min-w-0 text-base sm:text-lg">
                                        <p class="font-bold truncate" :class="{ 'line-through': player.heart === 0 }">
                                            {{ player.name }}
                                        </p>
                                        <p
                                            v-if="!roomInfo.hideHeart"
                                            class="text-sm opacity-70"
                                            :class="{ 'line-through': player.heart === 0 }"
                                        >
                                            Heart: {{ player.heart }}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div v-else class="text-error">Phòng không tồn tại</div>
                        </div>
                    </div>
                </div>
                <div class="lg:sticky lg:top-5 lg:self-start">
                    <div class="p-4 space-y-3 rounded-md bg-base-200">
                        <button
                            v-if="!roomInfo.hideAnswer"
                            class="w-full btn btn-info text-info-content"
                            onclick="listAnswer.showModal()"
                        >
                            Xem danh sách từ đã trả lời
                        </button>
                        <dialog id="listAnswer" class="modal">
                            <div class="modal-box">
                                <h3 class="text-lg font-bold">Danh sách từ đã trả lời</h3>
                                <p v-for="(word, index) in roomInfo.answerList" :key="index" class="py-2">{{ word }}</p>
                            </div>
                            <form method="dialog" class="modal-backdrop">
                                <button>close</button>
                            </form>
                        </dialog>
                        <button
                            v-if="isHost"
                            class="w-full btn btn-neutral text-neutral-content"
                            onclick="kickPlayer.showModal()"
                        >
                            Đuổi người chơi
                        </button>
                        <dialog id="kickPlayer" class="modal modal-top">
                            <div class="modal-box">
                                <h3 class="text-lg font-bold">Danh sách người chơi</h3>
                                <div
                                    v-for="player in roomInfo.playerLists"
                                    :key="player.id"
                                    class="flex items-center gap-5 my-3"
                                >
                                    <div class="avatar">
                                        <div class="w-10 rounded-md">
                                            <img :src="player.image" :class="{ grayscale: player.heart === 0 }" />
                                        </div>
                                    </div>
                                    <p class="font-bold">
                                        {{ player.name }}
                                    </p>
                                    <button
                                        v-show="!player.host"
                                        class="text-xl btn btn-sm btn-error text-error-content"
                                        @click="removePlayer(player)"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>
                            <form method="dialog" class="modal-backdrop">
                                <button>close</button>
                            </form>
                        </dialog>
                    </div>
                    <RoomChat />
                </div>
            </div>
        </div>

        <!-- Result room -->
        <div
            class="grid min-h-[calc(100vh-5rem)] items-center gap-6 py-8 md:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)_minmax(0,0.7fr)]"
            v-else-if="roomInfo.winner !== null"
        >
            <div class="hidden mx-auto md:block">
                <img src="~/assets/congratulation.gif" alt="" class="object-contain max-h-56" />
            </div>
            <div class="p-6 text-center rounded-md shadow-sm bg-base-200">
                <div class="flex flex-col items-center justify-center">
                    <img src="~/assets/congratulation.gif" alt="" class="object-contain mb-3 max-h-32 md:hidden" />
                    <h1 class="text-xl font-bold sm:text-2xl">Người chiến thắng chung cuộc cuối cùng</h1>
                    <div class="py-5 avatar">
                        <div class="w-24 rounded-xl sm:w-28">
                            <img :src="roomInfo.winner.image" alt="Avt nguoi thang cuoc" />
                        </div>
                    </div>
                    <h2 class="pb-5 text-xl font-bold text-primary sm:text-2xl">{{ roomInfo.winner.name }}</h2>
                </div>
                <div class="flex flex-col justify-center gap-3 sm:flex-row" v-if="isHost">
                    <button class="btn btn-primary text-primary-content" @click="goBack">Quay lại phòng chờ</button>
                    <button class="btn btn-secondary text-secondary-content" @click="playAgain">Chơi lại</button>
                </div>
                <div class="text-lg font-bold text-center sm:text-xl" v-else>
                    <p>Chờ chủ phòng quyết định chơi lại ...</p>
                </div>
            </div>
            <div class="hidden mx-auto md:block">
                <img src="~/assets/congratulation.gif" alt="" class="object-contain max-h-56" />
            </div>
        </div>
    </div>
</template>
