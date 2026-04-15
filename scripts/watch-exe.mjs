import { spawn } from 'node:child_process';
import process from 'node:process';
import chokidar from 'chokidar';

const watchPaths = [
  'src/**/*',
  'electron/**/*',
  'index.html',
  'package.json',
  'tsconfig.json',
  'vite.config.ts',
];

const ignoredPaths = [
  'dist/**',
  'release/**',
  'node_modules/**',
  '.vite-dev.log',
  '.vite-dev.err',
];

let buildRunning = false;
let buildQueued = false;
let lastReason = 'initial build';

function npmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function runBuild(reason) {
  lastReason = reason;

  if (buildRunning) {
    buildQueued = true;
    console.log(`[exe-watch] Cambio detectado durante un build. Se encola otra compilacion: ${reason}`);
    return;
  }

  buildRunning = true;
  console.log(`[exe-watch] Generando .exe (${reason})...`);

  const child = spawn(npmCommand(), ['run', 'exe'], {
    stdio: 'inherit',
  });

  child.on('exit', (code) => {
    buildRunning = false;

    if (code === 0) {
      console.log('[exe-watch] .exe actualizado en la carpeta release.');
    } else {
      console.error(`[exe-watch] La generacion del .exe fallo con codigo ${code}.`);
    }

    if (buildQueued) {
      buildQueued = false;
      runBuild(`cambios pendientes despues de ${lastReason}`);
    }
  });
}

const watcher = chokidar.watch(watchPaths, {
  ignored: ignoredPaths,
  ignoreInitial: true,
});

watcher.on('all', (event, filePath) => {
  runBuild(`${event}: ${filePath}`);
});

watcher.on('ready', () => {
  console.log('[exe-watch] Vigilando cambios para mantener el .exe actualizado...');
  runBuild('build inicial');
});
