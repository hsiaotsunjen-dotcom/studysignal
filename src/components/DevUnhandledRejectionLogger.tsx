"use client";

import { useEffect } from "react";

/** TEMP: dev-only — log the real `event.reason` for unhandled promise rejections. */
export function DevUnhandledRejectionLogger() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      console.error("[unhandledrejection] event.reason:", reason);
      if (reason instanceof Error) {
        console.error("[unhandledrejection] error.name:", reason.name);
        console.error("[unhandledrejection] error.message:", reason.message);
        console.error("[unhandledrejection] error.stack:", reason.stack);
      } else {
        console.dir(reason);
      }
    };

    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
