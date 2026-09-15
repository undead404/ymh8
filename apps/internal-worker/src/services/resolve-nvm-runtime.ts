import { exec } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

/**
 * Resolves the absolute paths for the Yarn executable and Node binary directory
 * by securely querying NVM's resolution engine without loading global shell profiles.
 */
export async function resolveNvmRuntime(targetFolder: string) {
  const nvmDirectory = process.env.NVM_DIR || path.join(os.homedir(), '.nvm');
  const nvmrcPath = path.join(targetFolder, '.nvmrc');

  // Sourcing NVM and running `which` in a non-login shell bypasses ~/.npmrc and profile pollution
  const command = `source "${nvmDirectory}/nvm.sh" && nvm which "$(cat '${nvmrcPath}')"`;

  const { stdout } = await execAsync(command, { shell: '/bin/bash' });

  // Extract the actual binary path, ignoring any potential NVM initialization echoes
  const nodeExecutable = stdout
    .split('\n')
    .find((line) => line.trim().startsWith(nvmDirectory));

  if (!nodeExecutable) {
    throw new Error(
      `Failed to resolve Node binary path via NVM. Raw output:\n${stdout}`,
    );
  }

  const nodeBinDirectory = path.dirname(nodeExecutable.trim());

  return {
    nodeExecutable: nodeExecutable.trim(),
    yarnExecutable: path.join(nodeBinDirectory, 'yarn'),
    nodeBinDirectory,
  };
}
