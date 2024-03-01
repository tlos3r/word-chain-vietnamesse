<script lang="ts" setup>
import type { RealtimeChannel } from "@supabase/supabase-js";
import { useStorage } from "@vueuse/core";
import { toast } from "vue3-toastify";
import type { words } from "@prisma/client/wasm";
const route = useRoute();
useHead({
    title: `Phòng ${route.params.id}`,
});
definePageMeta({
    middleware: ["auth"],
});
const client = useSupabaseClient();
let realtimeChannel: RealtimeChannel;
const user = useSupabaseUser();
const loading = ref(false);
const loading2 = ref(false);
const answer = ref("");
const errorMessage = ref("");

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
    })
);

const options = useStorage("options", {
    hideListAnswer: false,
    timesToAnswer: 0,
    sorted: false,
});

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
            hideAnswer: options.value.hideListAnswer,
            active: true,
            startPlayer: roomInfo.value.playerLists[0],
        },
        onRequestError({ request, options, error }) {
            console.error(request, options);
            useHandleError(error);
        },
    }).finally(async () => {
        loading.value = false;
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
    let getPlayerListLeft = roomInfo.value.playerLists.filter((player: any) => player.heart === 1);
    let playerIndex = roomInfo.value.playerLists
        .map((person: { id: string; name: string; image: string; heart: number }) => person.name)
        .indexOf(player.name);

    await $fetch(`/api/${route.params.id}/gameplay`, {
        method: "PATCH",
        headers: {
            "Content-type": "application/json",
        },
        body: {
            player,
            startPlayer: getPlayerListLeft[playerIndex - 1],
        },
    });
    if (getPlayerListLeft.length === 2) {
        updateWinnerPlayer(getPlayerListLeft[0]);
    }
};

/**
 * Validation input answer about word
 * @returns Promise
 */
const submitAnswer = async () => {
    loading.value = true;
    // get first letter
    const getFirstWord = answer.value.split(" ").shift();
    let getPlayerListLeft = roomInfo.value.playerLists.filter((player: any) => player.heart === 1);
    let nextPlayerIndex =
        getPlayerListLeft.map((player: { name: any }) => player.name).indexOf(roomInfo.value.startPlayer.name) + 1;
    if (answer.value.length === 0) {
        errorMessage.value = "Đã nhập từ chó nào đâu mà ấn enter làm gì";
        loading.value = false;
        return;
    }
    if (nextPlayerIndex === getPlayerListLeft.length) {
        nextPlayerIndex = 0;
    }

    if (roomInfo.value.lastAnswers.length > 0 && roomInfo.value.answerList.includes(answer.value)) {
        errorMessage.value = "Từ này đã được trả lời trước đó rồi";
        loading.value = false;
        return;
    }

    const { data } = await useFetch<words>("/api/word", {
        params: {
            s: answer.value,
        },
        headers: {
            "Content-type": "application/json",
        },
        onResponse({ response }) {
            if (response._data.status === "success") {
                if (roomInfo.value.lastAnswers.length === 0) {
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
                    updateNextPlayer(response._data.word.name, getPlayerListLeft[nextPlayerIndex]);
                    errorMessage.value = "";
                    answer.value = "";
                } else if (roomInfo.value.lastAnswers.split(" ").pop() !== getFirstWord) {
                    errorMessage.value = `Từ ${getFirstWord} không trùng với từ cuối trước đó là ${roomInfo.value.lastAnswers
                        .split(" ")
                        .pop()}`;
                }
            } else {
                errorMessage.value = `Từ ${answer.value} không tồn tại.`;
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
const giveUp = async () => {
    // get ramdom word
    const { data: randomWord } = await useFetch<any>("/api/random");

    await $fetch(`/api/${route.params.id}/gameplay`, {
        method: "PATCH",
        headers: {
            "Content-type": "application/json",
        },
        body: {
            playerId: user.value?.id,
        },
        onResponse({ response }) {
            if (response._data.status === "success") {
                // check player have heart = 1
                let totalPlayerLeft = response._data.updateRooms.playerLists.filter(
                    (player: any) => player.heart === 1
                );
                if (totalPlayerLeft.length === 1) {
                    updateWinnerPlayer(totalPlayerLeft[0]);
                } else {
                    // random next turn player
                    let playerIndex = totalPlayerLeft
                        .map((player: { name: any }) => player.name)
                        .indexOf(roomInfo.value.startPlayer.name);
                    let randomPlayerIndex = Math.floor(Math.random() * totalPlayerLeft.length) + 1;
                    while (randomPlayerIndex === playerIndex) {
                        randomPlayerIndex = Math.floor(Math.random() * totalPlayerLeft.length) + 1;
                    }
                    updateNextPlayer(randomWord.value.word.name, totalPlayerLeft[randomPlayerIndex]);
                }
            } else {
                toast.error(`${response._data.error}`);
            }
        },
        onResponseError({ error }) {
            useHandleError(error);
        },
    });
    answer.value = "";
    errorMessage.value = "";
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

onBeforeMount(async () => {
    const result = roomInfo.value.playerLists.some((player: any) => player.id === user.value?.id);

    if (!result) {
        await $fetch(`/api/${String(route.params.id)}/add`, {
            method: "PATCH",
            body: {
                player: {
                    id: user.value?.id,
                    name: user.value?.user_metadata.name,
                    image: user.value?.user_metadata.avatar_url,
                    heart: 1,
                },
            },
        });
        refresh();
    }
});
onMounted(() => {
    // Real time listener for new workouts
    realtimeChannel = client
        .channel(`${route.params.id}`)
        .on("postgres_changes", { event: "*", schema: "public", table: "rooms" }, () => {
            refresh();
        });
    realtimeChannel.subscribe();
});

onUnmounted(() => {
    client.removeChannel(realtimeChannel);
});
</script>

<template>
    <div class="container h-screen px-6">
        <!-- Waiting Room -->
        <div v-if="roomInfo.active == false" class="grid grid-cols-4 gap-6 md:grid-cols-8 lg:grid-cols-12 bg-base-100">
            <div class="col-span-4 m-5">
                <div class="flex items-center gap-5 p-3">
                    <p class="py-5 text-xl font-bold text-center">
                        Mã phòng :
                        <code class="p-2 font-mono tracking-widest rounded-xl bg-neutral text-neutral-content">{{
                            $route.params.id
                        }}</code>
                    </p>
                    <button @click="copy(source)" class="btn btn-neutral text-neutral-content btn-md">
                        <span v-if="!copied"><Icon name="gravity-ui:copy-xmark" class="text-xl" /></span>
                        <span v-else><Icon name="gravity-ui:copy-check" class="text-xl" /></span>
                    </button>
                </div>
                <div
                    v-if="roomInfo.playerLists.length >= 1"
                    v-for="player in roomInfo.playerLists"
                    class="p-3 mb-5 rounded-md bg-base-100 text-base-content"
                    :key="player.id"
                >
                    <div class="flex items-center gap-5">
                        <div class="avatar">
                            <div class="w-16 rounded-md">
                                <img :src="player.image" />
                                <Icon
                                    v-if="player.host"
                                    name="mdi:crown"
                                    class="absolute text-3xl text-yellow-400 -right-4 -top-4"
                                />
                            </div>
                        </div>
                        <div class="flex flex-col gap-3 text-xl">
                            <p class="font-bold">
                                <span> {{ player.name }}</span>
                                <span v-if="user?.id == player.id"> (bạn)</span>
                            </p>
                        </div>
                    </div>
                </div>
                <div v-else class="text-error">Phòng không tồn tại</div>
            </div>
            <div class="col-span-4 m-5 lg:col-span-8">
                <div v-if="user?.id === roomInfo.host" class="flex flex-col p-5 mb-5 rounded-md bg-base-200">
                    <p class="text-3xl font-bold text-center">Cài đặt</p>
                    <div class="form-control">
                        <label class="cursor-pointer label">
                            <span class="text-xl">Ẩn danh sách từ đã trả lời</span>
                            <input v-model="options.hideListAnswer" type="checkbox" class="toggle toggle-primary" />
                        </label>
                    </div>

                    <button
                        type="button"
                        class="my-5 text-xl btn btn-primary text-primary-content"
                        :class="{ 'btn-disabled': roomInfo.playerLists.length === 1 }"
                        @click="gameStart"
                    >
                        <span v-if="loading" class="loading loading-dots loading-md"></span>
                        <span v-else>Bắt đầu</span>
                    </button>
                </div>
                <div v-else class="flex flex-col p-5 mb-5 rounded-md bg-base-200">
                    <p class="text-xl font-bold text-center">Đợi chủ phòng bắt đầu trò chơi...</p>
                </div>
                <RoomChat />
            </div>
        </div>

        <!-- Starting RoomPlay -->
        <div v-if="roomInfo.active == true && roomInfo.winner == null">
            <div class="grid h-screen grid-cols-4 gap-6 pt-5 md:grid-cols-8 lg:grid-cols-12">
                <div class="col-span-4 lg:col-span-9">
                    <div class="relative flex flex-col">
                        <div class="w-full rounded-md bg-base-200 text-primary-content">
                            <div class="flex flex-col items-center justify-center gap-5 py-2">
                                <p class="font-bold text-base-content">
                                    Từ đã trả lời trước đó : <b class="text-secondary">{{ roomInfo.lastAnswers }}</b>
                                </p>
                                <p class="font-bold text-base-content">
                                    Đến lượt của
                                    <span v-if="user?.id === roomInfo.startPlayer.id">bạn</span>
                                    <span v-else class="text-primary">{{ roomInfo.startPlayer.name }}</span>
                                </p>
                                <div class="flex gap-5" v-show="user?.id === roomInfo.startPlayer.id">
                                    <label class="w-full max-w-xs form-control">
                                        <input
                                            type="text"
                                            placeholder="Trả lời ở đây nhé"
                                            class="w-full max-w-xs input input-bordered text-base-content"
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
                                        class="btn btn-primary text-primary-content"
                                        @click="submitAnswer"
                                        :class="{ 'btn-disabled': answer.length === 0 }"
                                    >
                                        <span v-if="loading" class="loading loading-dots loading-md"></span>
                                        <span v-else>Xác nhận</span>
                                    </button>
                                    <button
                                        class="btn btn-secondary text-secondary-content"
                                        v-if="roomInfo.answerList.length > 0"
                                        @click="giveUp"
                                    >
                                        <span v-if="loading2" class="loading loading-dots loading-md"></span>
                                        <span v-else>Đầu hàng</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="flex w-full mt-5 overflow-x-auto">
                            <div
                                v-if="roomInfo.playerLists.length >= 1"
                                v-for="player in roomInfo.playerLists"
                                class="p-3 mb-5 rounded-md bg-base-100 text-base-content"
                                :key="player.id"
                            >
                                <div class="flex items-center gap-5 p-5">
                                    <div class="avatar">
                                        <div class="w-16 rounded-md">
                                            <img :src="player.image" :class="{ grayscale: player.heart === 0 }" />
                                        </div>
                                        <Icon
                                            v-if="player.host"
                                            name="mdi:crown"
                                            class="absolute text-3xl text-yellow-400 -right-4 -top-4"
                                        />
                                    </div>
                                    <div class="flex flex-col gap-3 text-xl">
                                        <p class="font-bold" :class="{ 'line-through': player.heart === 0 }">
                                            {{ player.name }}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div v-else class="text-error">Phòng không tồn tại</div>
                        </div>
                    </div>
                </div>
                <div class="h-screen col-span-4 lg:col-span-3">
                    <div class="my-5">
                        <button
                            v-if="!roomInfo.hideAnswer"
                            class="w-full mb-5 btn btn-info text-info-content"
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
                            v-if="roomInfo.host === user?.id"
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
            class="grid items-center content-center grid-cols-4 gap-6 mt-10 md:mt-52 md:grid-cols-8 lg:grid-cols-12"
            v-if="roomInfo.winner !== null"
        >
            <div class="col-span-4 mx-auto my-0">
                <img src="~/assets/congratulation.gif" alt="" />
            </div>
            <div class="col-span-4">
                <div class="flex flex-col items-center justify-center">
                    <h1 class="text-2xl font-bold">Người chiến thắng chung cuộc cuối cùng</h1>
                    <div class="py-5 avatar">
                        <div class="w-24 rounded-xl">
                            <img :src="roomInfo.winner.image" alt="Avt nguoi thang cuoc" />
                        </div>
                    </div>
                    <h2 class="pb-5 text-xl font-bold text-primary">{{ roomInfo.winner.name }}</h2>
                </div>
                <div class="flex justify-center gap-5" v-if="roomInfo.host === user?.id">
                    <button class="btn btn-primary text-primary-content" @click="goBack">Quay lại phòng chờ</button>
                    <button class="btn btn-secondary text-secondary-content" @click="playAgain">Chơi lại</button>
                </div>
                <div class="text-xl font-bold text-center" v-else>
                    <p>Chờ chủ phòng quyết định chơi lại ...</p>
                </div>
            </div>
            <div class="col-span-4 mx-auto my-0">
                <div class="col-span-4 mx-auto my-0">
                    <img src="~/assets/congratulation.gif" alt="" />
                </div>
            </div>
        </div>
    </div>
</template>
