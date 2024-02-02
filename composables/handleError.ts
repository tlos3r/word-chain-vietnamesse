import { toast } from "vue3-toastify";

export const useHandleError = (error: unknown) => {
    let message;
    error instanceof Error ? (message = error.message) : (message = String(error));
    toast.error("Có lỗi gì đó đã xảy ra vui lòng thử lại sau");
    console.error(error);
};
