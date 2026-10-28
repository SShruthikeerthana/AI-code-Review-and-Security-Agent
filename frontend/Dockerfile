FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (for caching)
COPY package.json package-lock.json ./
RUN npm ci

# Copy full source and build
COPY . .
# We disable telemetry to suppress build warnings
ENV NEXT_TELEMETRY_DISABLED 1

# Note: for production builds in Next.js, API URLs usually need to be baked in
# Make sure NEXT_PUBLIC_API_URL is set in docker-compose.yml
RUN npm run build

# Runner stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Copy built assets from builder
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

ENV PORT 3000
# server.js is standard output by next build with standalone output configured
# But if standalone is not configured, we just use npm start
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next

CMD ["npm", "run", "start"]
