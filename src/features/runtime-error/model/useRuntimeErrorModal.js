import { useCallback, useEffect, useMemo, useState } from "react";
import { desktopApi } from "@shared/api";

const MAX_QUEUED_ERRORS = 8;

const appendErrorToQueue = (queue, nextError) => {
  if (!nextError) {
    return queue;
  }

  if (queue.some((queueItem) => queueItem.id === nextError.id)) {
    return queue;
  }

  const nextQueue = [...queue, nextError];

  if (nextQueue.length <= MAX_QUEUED_ERRORS) {
    return nextQueue;
  }

  return nextQueue.slice(-MAX_QUEUED_ERRORS);
};

export const useRuntimeErrorModal = () => {
  const [errorQueue, setErrorQueue] = useState([]);
  const isDesktopMode = useMemo(() => desktopApi.isDesktopMode(), []);

  useEffect(() => {
    if (!isDesktopMode) {
      return undefined;
    }

    return desktopApi.subscribeRuntimeErrors((errorPayload) => {
      setErrorQueue((queue) => appendErrorToQueue(queue, errorPayload));
    });
  }, [isDesktopMode]);

  const activeError = errorQueue.length > 0 ? errorQueue[0] : null;

  const closeModal = useCallback(() => {
    setErrorQueue((queue) => queue.slice(1));
  }, []);

  return {
    isOpen: Boolean(activeError),
    title: activeError?.title || "Application Error",
    message: activeError?.message || "",
    details: activeError?.details || "",
    closeModal,
  };
};
