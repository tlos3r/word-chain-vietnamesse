import type { User } from "@supabase/supabase-js";

const adjectives = ["Swift", "Lucky", "Bright", "Brave", "Calm", "Mighty", "Clever", "Jolly"];
const nouns = ["Lotus", "Comet", "River", "Pixel", "Drift", "Spark", "Echo", "Nova"];

const hashSeed = (seed: string) =>
    seed.split("").reduce((hash, char) => {
        return (hash * 31 + char.charCodeAt(0)) >>> 0;
    }, 7);

const getProfileSeed = (id?: string) => {
    return id && id.length > 0 ? id : crypto.randomUUID();
};

const fallbackName = (seed: string) => {
    const hash = hashSeed(seed);
    const adjective = adjectives[hash % adjectives.length];
    const noun = nouns[Math.floor(hash / adjectives.length) % nouns.length];
    const suffix = seed.replace(/-/g, "").slice(0, 4).toUpperCase();

    return `${adjective} ${noun} ${suffix}`;
};

export const createAnonymousPlayerProfile = (id?: string) => {
    const seed = getProfileSeed(id);
    const name = fallbackName(seed);

    return {
        id: seed,
        name,
        image: `https://api.dicebear.com/9.x/bottts-neutral/svg?seed=${encodeURIComponent(seed)}`,
        isAnonymous: true,
    };
};

export const usePlayerProfile = (user: User | null | undefined) => {
    const seed = getProfileSeed(user?.id);
    const fallbackProfile = createAnonymousPlayerProfile(seed);
    const metadata = user?.user_metadata ?? {};
    const metadataName = metadata.name ?? metadata.full_name ?? metadata.display_name;
    const name =
        typeof metadataName === "string" && metadataName.trim().length > 0
            ? metadataName
            : user?.email ?? fallbackProfile.name;

    const metadataImage = metadata.avatar_url ?? metadata.picture;
    const image =
        typeof metadataImage === "string" && metadataImage.trim().length > 0
            ? metadataImage
            : fallbackProfile.image;

    return {
        id: user?.id ?? seed,
        name,
        image,
        isAnonymous: user?.is_anonymous ?? false,
    };
};
