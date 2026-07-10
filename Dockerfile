# =============================================================================
# 9Router-Kiro Automator Dockerfile
# =============================================================================
# Multi-stage build for optimized image size

# Stage 1: Base image with dependencies
FROM mcr.microsoft.com/playwright:v1.40.0-jammy as base

# Set working directory
WORKDIR /app

# Install Node.js 18.x
RUN apt-get update && apt-get install -y \
    curl \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Stage 2: Dependencies
FROM base as dependencies

# Copy package files
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Stage 3: Application
FROM base as application

# Copy dependencies from previous stage
COPY --from=dependencies /app/node_modules ./node_modules

# Copy application source
COPY src ./src
COPY config ./config
COPY scripts ./scripts
COPY .env.example .env.example

# Create data directory
RUN mkdir -p /root/.9router/backups

# Set environment variables
ENV NODE_ENV=production
ENV LOG_LEVEL=info
ENV DB_PATH=/root/.9router/data.db

# Expose Chrome CDP port (if needed)
# EXPOSE 9222

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD node -e "console.log('healthy')" || exit 1

# Default command
ENTRYPOINT ["node", "src/index.js"]
CMD ["--help"]

# =============================================================================
# Usage Examples:
#
# Build:
#   docker build -t 9router-kiro-automator .
#
# Run with .env file:
#   docker run -it --rm \
#     --env-file .env \
#     -v ~/.9router:/root/.9router \
#     9router-kiro-automator run -e your.email@gmail.com -m 3
#
# Run with environment variables:
#   docker run -it --rm \
#     -e ROUTER_PASSWORD=your_password \
#     -e ENCRYPTION_KEY=your_key \
#     -v ~/.9router:/root/.9router \
#     9router-kiro-automator run -e your.email@gmail.com -m 3
#
# Interactive shell:
#   docker run -it --rm \
#     --env-file .env \
#     -v ~/.9router:/root/.9router \
#     --entrypoint /bin/bash \
#     9router-kiro-automator
#
# Check status:
#   docker run -it --rm \
#     -v ~/.9router:/root/.9router \
#     9router-kiro-automator status
# =============================================================================
