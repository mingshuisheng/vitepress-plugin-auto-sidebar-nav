import * as path from "path";
import { readdir, stat } from "./fileUtil";

export async function getNav(docsPath: string, excludes: string[]) {
  const root = await readAllDir(
    docsPath,
    excludes.map((f) => path.join(docsPath, f))
  );
  const rootNav = objToNav(root);
  return rootNav;
}

async function readAllDir(dirPath: string, excludes: string[]) {
  const subDirs = await readdir(dirPath);
  const filterDirs = subDirs.filter(
    (f) =>
      !excludes.some((exclude) => path.join(dirPath, f).startsWith(exclude))
  );
  const result = {} as Record<string, any>;

  for (let dir of filterDirs) {
    const curDirPath = path.join(dirPath, dir);
    const state = await stat(curDirPath);
    if (state.isDirectory() && (await hasMarkdown(curDirPath))) {
      result[dir] = await readAllDir(curDirPath, excludes);
    }
  }

  return result;
}

function objToNav(parent: Record<string, any>, parentLink: string = "") {
  return Object.keys(parent).reduce((prev, key) => {
    if (Object.keys(parent[key]).length <= 0) {
      prev.push({ text: key, link: `${parentLink}/${key}/` });
    } else {
      prev.push({
        text: key,
        items: objToNav(parent[key], `${parentLink}/${key}`),
      });
    }
    return prev;
  }, [] as any[]);
}

async function hasMarkdown(dirPath: string): Promise<boolean> {
  //当前文件夹或者子文件夹是否有markdown文件
  const state = await stat(dirPath);
  if (state.isFile()) return false;
  const subDirs = await readdir(dirPath);
  for (let dir of subDirs) {
    if (path.extname(dir) === ".md") return true;
    const subHasMarkdown = await hasMarkdown(path.join(dirPath, dir));
    if (subHasMarkdown) return true;
  }
  return false;
}
