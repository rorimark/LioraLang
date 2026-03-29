import { useCallback, useEffect, useMemo, useState } from "react";
import { usePlatformService } from "@shared/providers";

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
  const runtimeGateway = usePlatformService("runtimeGateway");
  const [errorQueue, setErrorQueue] = useState([]);
  const isDesktopMode = useMemo(() => runtimeGateway.isDesktopMode(), [runtimeGateway]);

  useEffect(() => {
    if (!isDesktopMode) {
      return undefined;
    }

    return runtimeGateway.subscribeRuntimeErrors((errorPayload) => {
      setErrorQueue((queue) => appendErrorToQueue(queue, errorPayload));
    });
  }, [isDesktopMode, runtimeGateway]);

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
