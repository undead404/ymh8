import { spawn, type SpawnOptions } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

import attachLineLogger from './attach-line-logger.js';

/**
 * Run a command inside a Node.js project folder, log output line-by-line,
 * and throw if the command exits with a non-zero status using stderr as the reason.
 *
 * @param folderPath - Path to the project folder (will be used as cwd).
 * @param command - The executable to run (e.g. "npm", "yarn", "node", "pnpm").
 * @param args - Arguments for the command (e.g. ["test"] or ["run", "build"]).
 * @param spawnOptions - Optional spawn options (env, shell, etc.). cwd will be overridden by folderPath.
 *
 * @throws Error - If the command fails. Error message contains stderr output (if any) and exit code.
 */
export async function runCommandInFolder(
  folderPath: string,
  command: string,
  arguments_: string[] = [],
  spawnOptions: SpawnOptions = {},
): Promise<void> {
  // Resolve and validate project path
  const resolved = path.resolve(folderPath);
  let stat;
  try {
    stat = await fs.stat(resolved);
  } catch {
    throw new Error(`Project path does not exist: ${resolved}`);
  }
  if (!stat.isDirectory()) {
    throw new Error(`Project path is not a directory: ${resolved}`);
  }

  // Ensure cwd is the project folder
  const options: SpawnOptions = {
    ...spawnOptions,
    cwd: resolved,
    env: { ...process.env, ...spawnOptions.env },
    stdio: 'pipe',
  };

  // Spawn the process
  const child = spawn(command, arguments_, options);

  // Log stdout lines as info, stderr lines as error and collect stderr
  const flushStdout = attachLineLogger(child.stdout, (line) => {
    console.log(line);
  });
  const flushStderr = attachLineLogger(child.stderr, (line) => {
    console.error(line);
  });

  // Wrap completion in a Promise
  const exitResult = await new Promise<{
    code: number | null;
    signal: NodeJS.Signals | null;
    spawnError?: Error;
  }>((resolve) => {
    let settled = false;

    child.on('error', (error) => {
      if (!settled) {
        settled = true;
        resolve({ code: null, signal: null, spawnError: error });
      }
    });

    child.on('close', (code, signal) => {
      if (!settled) {
        settled = true;
        resolve({ code, signal });
      }
    });
  });

  // Flush any remaining partial lines
  const stderrLines = flushStderr();
  flushStdout();

  // If spawn error occurred
  if (exitResult.spawnError) {
    throw new Error(
      `Failed to spawn process: ${exitResult.spawnError.message}`,
    );
  }

  const { code, signal } = exitResult;

  // If process was terminated by signal
  if (signal) {
    const reason =
      stderrLines.length > 0
        ? stderrLines.join('\n')
        : `Terminated by signal ${signal}`;
    throw new Error(
      `Command was terminated by signal ${signal}. Reason:\n${reason}`,
    );
  }

  // Non-zero exit code => throw using stderr as failing reason
  if (code !== 0) {
    const stderrText = stderrLines.length > 0 ? stderrLines.join('\n') : '';
    const message = stderrText || `Command exited with code ${code}`;
    throw new Error(message);
  }

  // Success: nothing to return
  return;
}
