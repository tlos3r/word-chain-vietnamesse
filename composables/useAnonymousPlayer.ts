type AnonymousPlayer = {
    id: string;
    name: string;
    image: string;
};

const anonymousPlayerKey = "anonymousPlayer";
const anonymousPlayerWindowPrefix = "word-chain-anonymous:";

const readStoredAnonymousPlayer = () => {
    if (!import.meta.client) {
        return null;
    }

    const stored = sessionStorage.getItem(anonymousPlayerKey);

    if (stored) {
        try {
            return JSON.parse(stored) as AnonymousPlayer;
        } catch {
            sessionStorage.removeItem(anonymousPlayerKey);
        }
    }

    if (window.name.startsWith(anonymousPlayerWindowPrefix)) {
        try {
            const player = JSON.parse(window.name.slice(anonymousPlayerWindowPrefix.length)) as AnonymousPlayer;
            sessionStorage.setItem(anonymousPlayerKey, JSON.stringify(player));
            return player;
        } catch {
            window.name = "";
        }
    }

    return null;
};

export const useAnonymousPlayer = () => {
    const player = useState<AnonymousPlayer | null>(anonymousPlayerKey, () => readStoredAnonymousPlayer());

    if (import.meta.client && !player.value) {
        player.value = readStoredAnonymousPlayer();
    }

    if (import.meta.client) {
        watch(
            player,
            (value) => {
                if (!value?.id) {
                    sessionStorage.removeItem(anonymousPlayerKey);
                    window.name = "";
                    return;
                }

                const serialized = JSON.stringify(value);
                sessionStorage.setItem(anonymousPlayerKey, serialized);
                window.name = `${anonymousPlayerWindowPrefix}${serialized}`;
            },
            { deep: true, immediate: true },
        );
    }

    return player;
};

export const resetAnonymousPlayerSession = () => {
    const player = useAnonymousPlayer();
    player.value = null;

    if (import.meta.client) {
        sessionStorage.removeItem(anonymousPlayerKey);
        window.name = "";
    }
};
