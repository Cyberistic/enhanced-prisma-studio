import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(scriptDir, "..");
const depsDir = path.join(workspaceRoot, "apps", "web", "node_modules", ".vite", "deps");
const outputDir = path.join(workspaceRoot, "research", "studio-core-snapshot");

function sanitizeSourcePath(sourcePath, index) {
  const normalized = sourcePath.replaceAll("\\", "/").split("?")[0].split("#")[0];
  const studioCoreMarker = "node_modules/@prisma/studio-core/";

  if (normalized.includes(studioCoreMarker)) {
    return path.join("@prisma", "studio-core", normalized.split(studioCoreMarker)[1]);
  }

  const withoutRelativePrefix = normalized.replace(/^(\.\.\/)+/, "");
  if (withoutRelativePrefix.length > 0) {
    return withoutRelativePrefix;
  }

  return `source-${index + 1}.txt`;
}

function withDuplicateSuffix(filePath, duplicateIndex) {
  const parsed = path.parse(filePath);
  const suffix = `__dup${duplicateIndex}`;
  return path.join(parsed.dir, `${parsed.name}${suffix}${parsed.ext}`);
}

async function main() {
  const depsEntries = await readdir(depsDir, { withFileTypes: true });
  const mapFiles = depsEntries
    .filter(
      (entry) =>
        entry.isFile() &&
        entry.name.startsWith("@prisma_studio-core_") &&
        entry.name.endsWith(".js.map"),
    )
    .map((entry) => entry.name)
    .sort();

  if (mapFiles.length === 0) {
    throw new Error(`No @prisma/studio-core sourcemaps found in ${depsDir}`);
  }

  await rm(outputDir, { force: true, recursive: true });
  await mkdir(outputDir, { recursive: true });

  const summary = {
    generatedAt: new Date().toISOString(),
    depsDir,
    mapFiles: [],
    totalPathCollisions: 0,
    totalExtractedSources: 0,
  };

  for (const mapFileName of mapFiles) {
    const mapPath = path.join(depsDir, mapFileName);
    const mapRaw = await readFile(mapPath, "utf8");
    const mapJson = JSON.parse(mapRaw);

    const sourceModuleName = mapFileName.replace(/\.js\.map$/, "");
    const moduleOutDir = path.join(outputDir, sourceModuleName);
    await mkdir(moduleOutDir, { recursive: true });

    const sources = Array.isArray(mapJson.sources) ? mapJson.sources : [];
    const sourcesContent = Array.isArray(mapJson.sourcesContent) ? mapJson.sourcesContent : [];
    const usedOutputPaths = new Set();
    let extractedForMap = 0;
    let pathCollisionsForMap = 0;

    for (let index = 0; index < sources.length; index += 1) {
      const sourcePath = String(sources[index] ?? "");
      const content = sourcesContent[index];
      if (typeof content !== "string") {
        continue;
      }

      const relativePath = sanitizeSourcePath(sourcePath, index);
      let uniqueRelativePath = relativePath;
      let duplicateIndex = 1;

      while (usedOutputPaths.has(uniqueRelativePath)) {
        duplicateIndex += 1;
        uniqueRelativePath = withDuplicateSuffix(relativePath, duplicateIndex);
      }

      if (uniqueRelativePath !== relativePath) {
        pathCollisionsForMap += 1;
      }

      usedOutputPaths.add(uniqueRelativePath);

      const outputPath = path.join(moduleOutDir, uniqueRelativePath);
      await mkdir(path.dirname(outputPath), { recursive: true });
      await writeFile(outputPath, content, "utf8");
      extractedForMap += 1;
    }

    summary.mapFiles.push({
      extractedSources: extractedForMap,
      fileName: mapFileName,
      pathCollisions: pathCollisionsForMap,
      sourceEntries: sources.length,
    });
    summary.totalPathCollisions += pathCollisionsForMap;
    summary.totalExtractedSources += extractedForMap;
  }

  await writeFile(
    path.join(outputDir, "manifest.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );

  console.log(
    `Extracted ${summary.totalExtractedSources} source files from ${summary.mapFiles.length} sourcemaps into ${outputDir}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
