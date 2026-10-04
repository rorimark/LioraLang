import process from "node:process";

export const createApplicationMenuManager = ({
  app,
  getTranslator,
  Menu,
  shell,
  homepageUrl,
  settingsMenuTabs,
  isDeveloperModeEnabled,
  requestDeckImportFromMenu,
  requestSettingsSectionFromMenu,
}) => {
  const buildViewMenuSubmenu = (t) => {
    const baseItems = [
      { role: "resetZoom", label: t("desktop.menu.resetZoom") },
      { role: "zoomIn", label: t("desktop.menu.zoomIn") },
      { role: "zoomOut", label: t("desktop.menu.zoomOut") },
      { type: "separator" },
      { role: "togglefullscreen", label: t("desktop.menu.fullScreen") },
    ];

    if (!isDeveloperModeEnabled()) {
      return baseItems;
    }

    return [
      { role: "reload", label: t("desktop.menu.reload") },
      { role: "forceReload", label: t("desktop.menu.forceReload") },
      { role: "toggleDevTools", label: t("desktop.menu.devTools") },
      { type: "separator" },
      ...baseItems,
    ];
  };

  const buildSettingsMenuSubmenu = (t) => {
    return settingsMenuTabs.map((tabConfig) => {
      const item = {
        // The same names as the sections in the app's settings.
        label: t(`settingsPage.sections.${tabConfig.key}.${tabConfig.key === "advanced-desktop" ? "desktopTitle" : "title"}`),
        click: () => {
          requestSettingsSectionFromMenu(
            tabConfig.key,
            tabConfig.sectionId,
            {
              highlight: tabConfig.key !== "general",
            },
          );
        },
      };

      if (tabConfig.accelerator) {
        item.accelerator = tabConfig.accelerator;
      }

      return item;
    });
  };

  const buildAppMenuSubmenu = (t) => {
    return [
      { role: "about", label: t("desktop.menu.about", { app: app.name || "Liora" }) },
      { type: "separator" },
      {
        label: t("nav.settings"),
        submenu: buildSettingsMenuSubmenu(t),
      },
      { type: "separator" },
      { role: "services", label: t("desktop.menu.services") },
      { type: "separator" },
      { role: "hide", label: t("desktop.menu.hide", { app: app.name || "Liora" }) },
      { role: "hideOthers", label: t("desktop.menu.hideOthers") },
      { role: "unhide", label: t("desktop.menu.showAll") },
      { type: "separator" },
      { role: "quit", label: t("desktop.menu.quit", { app: app.name || "Liora" }) },
    ];
  };

  const buildFileMenuSubmenu = (t) => {
    const submenu = [
      {
        label: t("desktop.menu.importDeck"),
        accelerator: "CmdOrCtrl+O",
        click: () => {
          void requestDeckImportFromMenu();
        },
      },
    ];

    if (process.platform !== "darwin") {
      submenu.push(
        {
          type: "separator",
        },
        { role: "quit", label: t("desktop.menu.quit", { app: app.name || "Liora" }) },
      );
    }

    return submenu;
  };

  const buildWindowMenuSubmenu = (t) => {
    if (process.platform === "darwin") {
      return [
        { role: "minimize", label: t("desktop.menu.minimize") },
        { role: "zoom", label: t("desktop.menu.zoom") },
        { role: "close", label: t("desktop.menu.close") },
        { type: "separator" },
        { role: "front", label: t("desktop.menu.front") },
      ];
    }

    return [
      { role: "minimize", label: t("desktop.menu.minimize") },
      { role: "maximize", label: t("desktop.menu.maximize") },
      { type: "separator" },
      { role: "close", label: t("desktop.menu.close") },
    ];
  };

  // The standard Edit menu, named in the app's language.
  const buildEditMenuSubmenu = (t) => [
    { role: "undo", label: t("desktop.menu.undo") },
    { role: "redo", label: t("desktop.menu.redo") },
    { type: "separator" },
    { role: "cut", label: t("desktop.menu.cut") },
    { role: "copy", label: t("desktop.menu.copy") },
    { role: "paste", label: t("desktop.menu.paste") },
    { role: "selectAll", label: t("desktop.menu.selectAll") },
  ];

  const syncApplicationMenu = () => {
    const t = getTranslator();
    const template = [];

    if (process.platform === "darwin") {
      template.push({
        label: app.name || "Liora",
        submenu: buildAppMenuSubmenu(t),
      });
    }

    template.push(
      {
        label: t("desktop.menu.file"),
        submenu: buildFileMenuSubmenu(t),
      },
      {
        label: t("desktop.menu.edit"),
        submenu: buildEditMenuSubmenu(t),
      },
      {
        label: t("desktop.menu.view"),
        submenu: buildViewMenuSubmenu(t),
      },
      {
        label: t("desktop.menu.window"),
        role: "window",
        submenu: buildWindowMenuSubmenu(t),
      },
      {
        role: "help",
        label: t("desktop.menu.help"),
        submenu: [
          {
            label: t("desktop.menu.github"),
            click: () => {
              void shell.openExternal(homepageUrl);
            },
          },
        ],
      },
    );

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
  };

  return {
    syncApplicationMenu,
  };
};
