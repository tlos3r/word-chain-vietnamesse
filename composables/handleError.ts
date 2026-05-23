import { toast } from "vue3-toastify";

export const useHandleError = (error: unknown) => {
    let message;
    error instanceof Error ? (message = error.message) : (message = String(error));
    toast.error(message);
    console.error(message);
};
