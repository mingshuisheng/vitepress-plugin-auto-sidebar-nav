import type { ViteDevServer, Plugin } from "vite";
import { getNav } from "./nav";
import { getSidebar } from "./sidebar";

export interface Options {
  docsDir: string;
  exclude?: string[];
}

export default function VitePluginAutoSidebarAndNav(options: Options) {
  const opts = normalizeOptions(options);
  return <Plugin>{
    name: "vitepress-plugin-auto-sidebar-and-nav",
    config: async (config) => {
      //@ts-ignore
      config.vitepress.userConfig.themeConfig.sidebar = await getSidebar(
        opts.docsDir,
        opts.exclude ?? []
      );
      //@ts-ignore
      config.vitepress.userConfig.themeConfig.nav = await getNav(
        opts.docsDir,
        opts.exclude ?? []
      );
      return config;
    },
    configureServer: ({ watcher, restart }: ViteDevServer) => {
      const fsWatcher = watcher.add("*.md");
      fsWatcher.on("all", (event) => {
        if (["addDir", "unlinkDir"].includes(event)) return;
        restart();
      });
    },
  };
}

function normalizeOptions(options: Options): Options {
  return options;
}
