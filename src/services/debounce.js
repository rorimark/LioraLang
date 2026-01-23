export function debouncePromise(fn, delay = 300) {
  let timeoutId = null;
  let lastArgs;
  let lastThis;
  let pending = null;

  return function (...args) {
    lastArgs = args;
    lastThis = this;

    if (pending) {
      pending.reject({ canceled: true });
      pending = null;
    }

    return new Promise((resolve, reject) => {
      pending = { resolve, reject };

      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        Promise.resolve(fn.apply(lastThis, lastArgs))
          .then(resolve, reject)
          .finally(() => {
            pending = null;
            timeoutId = null;
            lastArgs = lastThis = null;
          });
      }, delay);
    });
  };
}

export function debounce(fn, delay = 300) {
  let timeoutId = null;

  return (...args) => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      fn(...args);
    }, delay);
  };
}
