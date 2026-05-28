# Multi-stage build for supply-chain hygiene.
#
# WHY: `node:20-alpine` ships the npm CLI at /usr/local/lib/node_modules/npm/,
# which bundles its own copies of cross-spawn / glob / minimatch / tar. Trivy
# image-scan flags those as HIGH (CVE-2024-21538, CVE-2025-64756, the 2026
# minimatch + tar DoS / path-traversal series). Application overrides cannot
# fix base-image bundled tooling.
#
# Strategy: install with npm in a build stage, then copy ONLY node_modules
# and source into a runtime stage with npm removed. The runtime image carries
# no build tooling and no vulnerable bundled deps.

# ---------- Build stage ----------
FROM node:20-alpine AS build
WORKDIR /app

COPY app/package*.json ./
RUN npm ci --omit=dev

# ---------- Runtime stage ----------
FROM node:20-alpine AS runtime
WORKDIR /app

# Remove npm + npx (and their bundled deps) — runtime doesn't need them.
RUN rm -rf /usr/local/lib/node_modules/npm \
           /usr/local/bin/npm \
           /usr/local/bin/npx \
           /opt/yarn-* \
           /usr/local/bin/yarn \
           /usr/local/bin/yarnpkg

COPY --from=build /app/node_modules ./node_modules
COPY app/ ./

# Drop privileges — the `node` user is pre-created in the official image.
USER node

EXPOSE 3000
CMD ["node", "server.js"]
