import { createTargetPlatformServices } from "@platform-target";

export const createPlatformServices = () => createTargetPlatformServices();

let cachedPlatformServices = null;

export const getPlatformServices = () => {
  if (cachedPlatformServices) {
    return cachedPlatformServices;
  }

  cachedPlatformServices = createPlatformServices();
  return cachedPlatformServices;
};
