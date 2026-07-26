const fs = require('fs');
const assert = require('assert');

const dockerfile = fs.readFileSync('Dockerfile', 'utf8');
const workflow = fs.readFileSync('.github/workflows/docker-image.yml', 'utf8');
const dockerignore = fs.readFileSync('.dockerignore', 'utf8');
const docs = fs.readFileSync('docs/docker-ci-cache.md', 'utf8');

assert.match(dockerfile, /^# syntax=docker\/dockerfile:1\.7/m, 'Dockerfile must opt in to BuildKit syntax');
assert.match(dockerfile, /ARG NODE_IMAGE=node:22-bookworm-slim@sha256:[a-f0-9]{64}/, 'Node base image must be digest-pinned');
assert.match(dockerfile, /FROM base AS deps[\s\S]*COPY package\.json package-lock\.json \.\/[\s\S]*RUN npm ci/, 'dependency layer must copy lockfiles before npm ci');
assert.match(dockerfile, /FROM base AS runtime-deps[\s\S]*RUN npm ci --omit=dev && npm cache clean --force/, 'runtime dependencies must be isolated and cacheable');

assert.match(workflow, /cache-from: type=gha,scope=\$\{\{ env\.CACHE_SCOPE \}\}/, 'workflow must restore BuildKit cache from gha');
assert.match(workflow, /cache-to: type=gha,scope=\$\{\{ env\.CACHE_SCOPE \}\},mode=\$\{\{ env\.CACHE_MODE \}\}/, 'workflow must save BuildKit cache to gha');
assert.match(workflow, /schedule:[\s\S]*cron: '17 3 \* \* 1'/, 'workflow must warm cache weekly');
assert.match(workflow, /canary-analysis:/, 'workflow must include a canary analysis job');
assert.match(workflow, /Review the build logs for `CACHED` layer entries/, 'workflow must publish monitoring guidance');

for (const entry of ['node_modules', 'dist', 'coverage', 'tests', 'docs']) {
  assert(dockerignore.split(/\r?\n/).includes(entry), `.dockerignore must exclude ${entry}`);
}

assert.match(docs, /blue-green/i, 'cache runbook must document blue-green deployment posture');
assert.match(docs, /canary/i, 'cache runbook must document canary analysis');
assert.match(docs, /security review/i, 'cache runbook must document security review');

console.log('Docker cache CI configuration is valid.');
