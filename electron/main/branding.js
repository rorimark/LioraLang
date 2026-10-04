import { BRAND_NAME } from "../../packages/shared/src/config/brand.js";

export const applyPublicBrand = (app) => {
  // Capture the old path before Electron derives a new one from the public name.
  const userDataPath = app.getPath("userData");
  app.setName(BRAND_NAME);
  app.setPath("userData", userDataPath);
};
