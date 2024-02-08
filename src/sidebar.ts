import matter from "gray-matter";
import * as path from "path";
import { type DefaultTheme } from "vitepress/types/default-theme";
import { readFile, readdir, stat } from "./fileUtil";

export async function getSidebar(docsPath: string, excludes: string[]) {
  const markdownFiles = await readAllFile(
    docsPath,
    ".md",
    excludes.map((f) => path.join(docsPath, f))
  );

  const fileInfos: FileInfo[] = [];

  for (const file of markdownFiles) {
    fileInfos.push(await getFileInfo(file));
  }

  const sidebar: DefaultTheme.SidebarMulti = fileInfos
    .map((info) => ({
      parent: info.fileDir.replace(docsPath, "").replace(/\\/g, "/"),
      text: info.sidebarText ?? info.fileNameWithoutExt,
      link:
        info.fileDir.replace(docsPath, "").replace(/\\/g, "/") +
        "/" +
        info.fileNameWithoutExt,
    }))
    .reduce((sidebar, cur) => {
      if (!sidebar[cur.parent]) {
        sidebar[cur.parent] = [];
      }
      (sidebar[cur.parent] as DefaultTheme.SidebarItem[]).push({
        text: cur.text,
        link: cur.link,
      });
      return sidebar;
    }, {} as DefaultTheme.SidebarMulti);

  return {
    sidebar,
    cache: fileInfos.reduce((map, cur) => {
      map.set(cur.filePath, cur);
      return map;
    }, new Map<string, FileInfo>()),
  } as const;
}

async function readAllFile(
  dirPath: string,
  endswith: string,
  excludes: string[]
): Promise<string[]> {
  const current = (await readdir(dirPath)).filter(
    (f) =>
      !excludes.some((exclude) => path.join(dirPath, f).startsWith(exclude))
  );

  const nextDirs: string[] = [];

  for (let cur of current) {
    const state = await stat(path.join(dirPath, cur));
    if (state.isDirectory()) {
      nextDirs.push(cur);
    }
  }

  const files = current
    .filter((f) => f.endsWith(endswith))
    .map((f) => path.join(dirPath, f));
  if (nextDirs.length > 0) {
    for (const dir of nextDirs) {
      const subFiles = await readAllFile(
        path.join(dirPath, dir),
        endswith,
        excludes
      );
      files.push(...subFiles);
    }
  }
  return files;
}

export type FileInfo = {
  sidebarText: string;
  filePath: string;
  fileName: string;
  fileDir: string;
  fileNameWithoutExt: string;
};

export async function getFileInfo(filePath: string): Promise<FileInfo> {
  const content = await readFile(filePath);

  return {
    sidebarText: matter(content).data.sidebarText,
    filePath,
    fileName: path.basename(filePath),
    fileDir: path.dirname(filePath),
    fileNameWithoutExt: path.basename(filePath, ".md"),
  };
}
