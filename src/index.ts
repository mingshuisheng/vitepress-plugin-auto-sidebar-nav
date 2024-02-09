import type { ViteDevServer, Plugin } from "vite";
import { getNav } from "./nav";
import { getFileInfo, getSidebar, FileInfo } from "./sidebar";

export interface Options {
  docsDir: string;
  exclude?: string[];
}

export default function VitePluginAutoSidebarAndNav(options: Options) {
  const opts = normalizeOptions(options);
  let timer: ReturnType<typeof setTimeout> | undefined;

  function clear() {
    clearTimeout(timer);
  }
  function schedule(fn: () => void) {
    clear();
    timer = setTimeout(fn, 500);
  }

  let cacheMap: Map<string, FileInfo> | undefined;

  return <Plugin>{
    name: "vitepress-plugin-auto-sidebar-and-nav",
    config: async (config) => {
      const { sidebar, cache } = await getSidebar(
        opts.docsDir,
        opts.exclude ?? []
      );
      cacheMap = cache;
      //@ts-ignore
      config.vitepress.userConfig.themeConfig.sidebar = sidebar;
      //@ts-ignore
      config.vitepress.userConfig.themeConfig.nav = await getNav(
        opts.docsDir,
        opts.exclude ?? []
      );

      return config;
    },
    configureServer: ({ watcher, restart }: ViteDevServer) => {
      const fsWatcher = watcher.add("*.md");
      const restartServer = () => schedule(restart);
      fsWatcher.on("add", restartServer);
      fsWatcher.on("unlink", restartServer);
      fsWatcher.on("change", async (path) => {
        const oldInfo = cacheMap?.get(path);
        if (!oldInfo) {
          restartServer();
          return;
        }
        const markdownInfo = await getFileInfo(path);
        const oldText = oldInfo.sidebarText ?? oldInfo.fileNameWithoutExt;
        const newText =
          markdownInfo.sidebarText ?? markdownInfo.fileNameWithoutExt;

        if (oldText !== newText) {
          restartServer();
          return;
        }
      });
    },
  };
}

function normalizeOptions(options: Options): Options {
  return options;
}
