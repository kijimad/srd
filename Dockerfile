# Build stage
FROM node:25-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (including devDependencies for build)
RUN npm install

# Copy application files
COPY . .

# Build Next.js application
RUN npm run build

# Production stage
FROM node:25-alpine

WORKDIR /app

# Copy standalone build
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Create pdfs directory for mounting
RUN mkdir -p /pdfs

# Set PDF directory environment variable
ENV PDF_DIR=/pdfs

# Expose port
EXPOSE 8000

# Start Next.js standalone server
ENV PORT=8000
CMD ["node", "server.js"]
