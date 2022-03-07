import fs from 'fs/promises';
import path from 'path';

const NODE_MODULES_FOLDER_NAME = 'node_modules';

const copyFile = async (filePath: string, targetFolder: string) => {
  const targetFile = path.join(targetFolder, path.basename(filePath));
  await fs.writeFile(targetFile, await fs.readFile(filePath));
};

const copyFolderRecursive = async (sourceFolder: string, targetFolder: string) => {
  const childFolder = path.join(targetFolder, path.basename(sourceFolder));
  await fs.mkdir(childFolder);
  const files = await fs.readdir(sourceFolder);

  await Promise.all(
    files.map(async file => {
      const filePath = path.join(sourceFolder, file);
      const isDirectory = (await fs.lstat(filePath)).isDirectory();

      if (isDirectory) {
        await copyFolderRecursive(filePath, childFolder);
      } else {
        await copyFile(filePath, childFolder);
      }
    })
  );
};

const findSymlinks = async (dirPath: string) => {
  const paths: string[] = [];
  const dirContent = await fs.readdir(dirPath);

  await Promise.all(
    dirContent.map(async file => {
      const filePath = path.join(dirPath, file);
      const stat = await fs.lstat(filePath);

      if (stat.isDirectory()) {
        paths.push(...(await findSymlinks(filePath)));
      } else if (stat.isSymbolicLink()) {
        paths.push(filePath);
      }
    })
  );

  return paths;
};

export const deleteSymbolicLinks = async () => {
  const cwd = process.cwd();
  const nodeModules = path.join(cwd, NODE_MODULES_FOLDER_NAME);
  const symlinks = await findSymlinks(nodeModules);

  const symlinksToProcess = symlinks.filter(p => !p.includes('.bin'));

  console.log({ filteredTargets: symlinksToProcess });

  await Promise.all(
    symlinksToProcess.map(async symlink => {
      const symlinkRealPath = await fs.realpath(symlink);
      await fs.unlink(symlink);
      const targetFolder = path.join(symlink, '..');
      await copyFolderRecursive(symlinkRealPath, targetFolder);
    })
  );
};