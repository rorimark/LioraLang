import process from "node:process";

export const createApplicationMenuManager = ({
  app,
  Menu,
  shell,
  homepageUrl,
  settingsMenuTabs,
  isDeveloperModeEnabled,
  requestDeckImportFromMenu,
  requestSettingsSectionFromMenu,
}) => {
  const buildViewMenuSubmenu = () => {
    const baseItems = [
      { role: "resetZoom" },
      { role: "zoomIn" },
      { role: "zoomOut" },
      { type: "separator" },
      { role: "togglefullscreen" },
    ];

    if (!isDeveloperModeEnabled()) {
      return baseItems;
    }

    return [
      { role: "reload" },
      { role: "forceReload" },
      { role: "toggleDevTools" },
      { type: "separator" },
      ...baseItems,
    ];
  };

  const buildSettingsMenuSubmenu = () => {
    return settingsMenuTabs.map((tabConfig) => {
      const item = {
        label: tabConfig.label,
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

  const buildAppMenuSubmenu = () => {
    return [
      { role: "about" },
      { type: "separator" },
      {
        label: "Settings",
        submenu: buildSettingsMenuSubmenu(),
      },
      { type: "separator" },
      { role: "services" },
      { type: "separator" },
      { role: "hide" },
      { role: "hideOthers" },
      { role: "unhide" },
      { type: "separator" },
      { role: "quit", label: "Quit LioraLang" },
    ];
  };

  const buildFileMenuSubmenu = () => {
    const submenu = [
      {
        label: "Import deck file...",
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
        { role: "quit" },
      );
    }

    return submenu;
  };

  const buildWindowMenuSubmenu = () => {
    if (process.platform === "darwin") {
      return [
        { role: "minimize" },
        { role: "zoom" },
        { role: "close" },
        { type: "separator" },
        { role: "front" },
      ];
    }

    return [
      { role: "minimize" },
      { role: "maximize" },
      { type: "separator" },
      { role: "close" },
    ];
  };

  const syncApplicationMenu = () => {
    const template = [];

    if (process.platform === "darwin") {
      template.push({
        label: app.name || "LioraLang",
        submenu: buildAppMenuSubmenu(),
      });
    }

    template.push(
      {
        label: "File",
        submenu: buildFileMenuSubmenu(),
      },
      { role: "editMenu" },
      {
        label: "View",
        submenu: buildViewMenuSubmenu(),
      },
      {
        label: "Window",
        submenu: buildWindowMenuSubmenu(),
      },
      {
        role: "help",
        submenu: [
          {
            label: "LioraLang GitHub",
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
