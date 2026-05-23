import { useStorage } from "@vueuse/core";

type GameplaySound = "timeStart" | "timeAlmostEnd" | "nextPlayer" | "winner" | "playerLost";

const soundPresets: Record<GameplaySound, { frequencies: number[]; duration: number; type: OscillatorType }> = {
    timeStart: { frequencies: [660, 880], duration: 0.12, type: "sine" },
    timeAlmostEnd: { frequencies: [880, 880, 880], duration: 0.08, type: "square" },
    nextPlayer: { frequencies: [523, 659, 784], duration: 0.1, type: "triangle" },
    winner: { frequencies: [523, 659, 784, 1046], duration: 0.14, type: "sine" },
    playerLost: { frequencies: [392, 330, 262], duration: 0.16, type: "sawtooth" },
};

export const useGameplaySounds = () => {
    const soundEnabled = useStorage("soundEnabled", true);
    let audioContext: AudioContext | null = null;

    const getAudioContext = () => {
        if (!import.meta.client || !soundEnabled.value) {
            return null;
        }

        audioContext ??= new AudioContext();

        if (audioContext.state === "suspended") {
            audioContext.resume().catch(() => {});
        }

        return audioContext;
    };

    const play = (sound: GameplaySound) => {
        const context = getAudioContext();

        if (!context) {
            return;
        }

        const preset = soundPresets[sound];
        const now = context.currentTime;

        preset.frequencies.forEach((frequency, index) => {
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            const startAt = now + index * (preset.duration + 0.03);
            const stopAt = startAt + preset.duration;

            oscillator.type = preset.type;
            oscillator.frequency.setValueAtTime(frequency, startAt);
            gain.gain.setValueAtTime(0.0001, startAt);
            gain.gain.exponentialRampToValueAtTime(0.12, startAt + 0.015);
            gain.gain.exponentialRampToValueAtTime(0.0001, stopAt);
            oscillator.connect(gain);
            gain.connect(context.destination);
            oscillator.start(startAt);
            oscillator.stop(stopAt);
        });
    };

    return {
        play,
    };
};
