FROM node:24-slim

# Install Chromium dependencies for Playwright
# Install Playwright system dependencies
RUN apt-get update && apt-get install -y \
    libnss3 libnspr4 libatk-bridge2.0-0 libdrm2 libxkbcommon0 \
    libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    libgbm1 libpango-1.0-0 libcairo2 libasound2 \
    fonts-liberation libu2f-udev \
    && rm -rf /var/lib/apt/lists/*

# Install pnpm globally
RUN npm install -g pnpm

WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --ignore-scripts

# Download Playwright Chromium browser
RUN npx playwright install chromium

COPY tsconfig.json ./
COPY src/ ./src/
RUN pnpm build

CMD ["node", "dist/main.js"]
