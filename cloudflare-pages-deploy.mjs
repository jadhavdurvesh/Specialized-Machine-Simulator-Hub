import { execFileSync } from 'node:child_process';

const projectName = 'specialized-machine-simulator-hub';

function run(args) {
  execFileSync('npx', ['wrangler', ...args], { stdio: 'inherit' });
}

// Create the Pages project if it does not exist yet. If it already exists,
// continue with deployment.
try {
  run(['pages', 'project', 'create', projectName]);
} catch {
  // Existing project is fine; deploy to it below.
}

run(['pages', 'deploy', 'dist', '--project-name', projectName]);
