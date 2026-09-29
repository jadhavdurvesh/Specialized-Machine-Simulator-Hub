import { execFileSync } from 'node:child_process';

const projectName = 'specialized-machine-simulator-hub';
const productionBranch = 'main';

function run(args) {
  execFileSync('npx', ['wrangler', ...args], { stdio: 'inherit' });
}

// Create the Pages project if it does not exist yet. The explicit production
// branch keeps this non-interactive for Cloudflare's build environment.
try {
  run(['pages', 'project', 'create', projectName, '--production-branch', productionBranch]);
} catch {
  // Existing project is fine; deploy to it below.
}

run([
  'pages',
  'deploy',
  'dist',
  '--project-name',
  projectName,
  '--branch',
  productionBranch
]);
