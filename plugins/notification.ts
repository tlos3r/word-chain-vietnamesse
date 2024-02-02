export default defineNuxtPlugin((nuxtApp) => {
    nuxtApp.hook("vue:error", (err, target, info) => {
        useHandleError(err);
        console.log(target, info);
    });
});
