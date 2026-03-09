import { memo, useMemo } from "react";
import { getPlatformServices } from "@shared/platform";
import { PlatformContext } from "./PlatformContext";

export const PlatformProvider = memo(({ children }) => {
  const services = useMemo(() => {
    return getPlatformServices();
  }, []);

  return (
    <PlatformContext.Provider value={services}>
      {children}
    </PlatformContext.Provider>
  );
});

PlatformProvider.displayName = "PlatformProvider";
