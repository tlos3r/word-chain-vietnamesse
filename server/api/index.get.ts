export default defineEventHandler(() => {
    return {
        status: "ok",
        endpoints: [
            { method: "POST", path: "/api/create" },
            { method: "GET", path: "/api/random" },
            { method: "GET", path: "/api/word" },
            { method: "GET", path: "/api/:id/details" },
            { method: "PATCH", path: "/api/:id/details" },
            { method: "PATCH", path: "/api/:id/add" },
            { method: "PATCH", path: "/api/:id/gameplay" },
            { method: "GET", path: "/api/:id/message" },
            { method: "PATCH", path: "/api/:id/message" },
        ],
    };
});
