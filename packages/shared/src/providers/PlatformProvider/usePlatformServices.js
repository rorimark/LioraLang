import { useContext } from "react";
import { PlatformContext } from "./PlatformContext";

const assertPlatformContext = (contextValue) => {
  if (!contextValue) {
    throw new Error("PlatformProvider is missing in the app root");
  }
};

export const usePlatformServices = () => {
  const contextValue = useContext(PlatformContext);

  assertPlatformContext(contextValue);
  return contextValue;
};

export const usePlatformService = (serviceName) => {
  const services = usePlatformServices();
  const resolvedService =
    typeof serviceName === "string" ? services[serviceName] : undefined;

  if (!resolvedService) {
    throw new Error(`Unknown platform service: ${String(serviceName)}`);
  }

  return resolvedService;
};
