import { copyFile, mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { spawn } from 'node:child_process';

const rootDir = process.cwd();

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function run(commandLine) {
  return new Promise((resolve, reject) => {
    const child = spawn(commandLine, {
      cwd: rootDir,
      stdio: 'inherit',
      shell: true,
    });

    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${commandLine} fallo con codigo ${code}`));
    });
  });
}

function buildStamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function main() {
  const stamp = buildStamp();
  const outputDir = path.join(rootDir, 'release', 'builds', stamp);
  const latestDir = path.join(rootDir, 'release', 'latest');

  await mkdir(outputDir, { recursive: true });
  await mkdir(latestDir, { recursive: true });

  console.log(`[build-exe] Build de escritorio: ${stamp}`);

  await run(`${npmCommand()} run build`);
  await run(
    `${npmCommand()} exec electron-builder -- --win portable --publish never --config.directories.output="${outputDir}"`
  );

  const files = await readdir(outputDir);
  const exeName = files.find((file) => file.endsWith('.exe'));

  if (!exeName) {
    throw new Error(`No se encontro el .exe generado en ${outputDir}`);
  }

  const exePath = path.join(outputDir, exeName);
  const latestExePath = path.join(latestDir, 'baby-store-inventory-latest.exe');
  const latestInfoPath = path.join(latestDir, 'LATEST_BUILD.txt');

  try {
    await copyFile(exePath, latestExePath);
  } catch (error) {
    console.warn('[build-exe] No se pudo sobrescribir baby-store-inventory-latest.exe. Usa la ruta del build mas reciente.');
    console.warn(`[build-exe] Motivo: ${error.message}`);
  }

  await writeFile(
    latestInfoPath,
    [
      `Build timestamp: ${stamp}`,
      `Executable: ${exePath}`,
      `Latest alias: ${latestExePath}`,
    ].join('\n'),
    'utf8'
  );

  console.log(`[build-exe] Ejecutable generado en: ${exePath}`);
  console.log(`[build-exe] Referencia actualizada en: ${latestInfoPath}`);
}

main().catch((error) => {
  console.error(`[build-exe] ${error.message}`);
  process.exitCode = 1;
});
