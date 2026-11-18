import toast from "react-hot-toast";
import { ApiError } from "../fastapiService/core/ApiError";

export function success(message: string): void {
  toast.success(message, { duration: 1500 });
}

export function error(message: string, duration = 5000): void {
  toast.error(message, { duration });
}

export function info(message: string): void {
  toast(message, { duration: 2000 });
}

export function warning(message: string): void {
  toast(message, {
    duration: 3000,
    icon: "⚠️",
    style: { background: "#fff3cd", color: "#856404" },
  });
}

export function extractApiErrorMessage(e: ApiError): string {
  if (e.status === 403) return "请先登录";
  const body = e.body as Record<string, unknown> | undefined;
  const detail = body?.detail;
  if (typeof detail === "string" && detail) {
    return `${e.url}:${e.status}:${detail}`;
  }
  return `${e.url}:${e.status}:${e.statusText}`;
}

export function handleApiError(e: unknown): void {
  if (e instanceof ApiError) {
    error(extractApiErrorMessage(e));
  } else {
    console.error("Unexpected error:", e);
    error("发生未知错误，请查看控制台了解详情");
  }
}

export function wrapPromise<T>(
  loadingMsg: string,
  promise: Promise<T>,
  successMsg: string | ((data: T) => string),
  errorMsg?: string | ((err: unknown) => string),
): Promise<T> {
  const toaster = toast.loading(loadingMsg);

  return promise
    .then((data) => {
      const msg =
        typeof successMsg === "function" ? successMsg(data) : successMsg;
      toast.success(msg, { duration: 1500, id: toaster });
      return data;
    })
    .catch((err: unknown) => {
      let msg: string;
      if (errorMsg) {
        msg = typeof errorMsg === "function" ? errorMsg(err) : errorMsg;
      } else if (err instanceof ApiError) {
        msg = extractApiErrorMessage(err);
      } else {
        msg = "请求失败";
      }
      toast.error(msg, { duration: 5000, id: toaster });
      throw err;
    });
}