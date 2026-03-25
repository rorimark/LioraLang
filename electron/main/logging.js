export const createLogger = ({
  levels,
  priorities,
  getCurrentLevel,
}) => {
  const shouldLog = (targetLevel) => {
    const targetPriority = priorities[targetLevel] || priorities[levels.error];
    const currentPriority = priorities[getCurrentLevel()] || priorities[levels.error];

    return currentPriority >= targetPriority;
  };

  const logWarn = (...args) => {
    if (shouldLog(levels.warn)) {
      console.warn(...args);
    }
  };

  const logDebug = (...args) => {
    if (shouldLog(levels.debug)) {
      console.info(...args);
    }
  };

  const logError = (...args) => {
    if (shouldLog(levels.error)) {
      console.error(...args);
    }
  };

  return {
    shouldLog,
    logWarn,
    logDebug,
    logError,
  };
};
