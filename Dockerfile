# Dockerfile for AppTuner relay server with zsign support
FROM node:18-slim

WORKDIR /app

# Install zsign build dependencies
RUN apt-get update && apt-get install -y \
    git g++ cmake libssl-dev libminizip-dev zlib1g-dev \
    libssl3 libminizip1 ca-certificates \
    --no-install-recommends && rm -rf /var/lib/apt/lists/*

# Build zsign from source
RUN git -c http.sslVerify=false clone https://github.com/zhlynn/zsign /tmp/zsign && \
    cd /tmp/zsign/src && \
    g++ -std=c++11 -I. -I./common -I/usr/include/minizip \
        -o zsign zsign.cpp archo.cpp bundle.cpp macho.cpp openssl.cpp signing.cpp common/*.cpp \
        -lssl -lcrypto -lminizip -lz && \
    cp zsign /usr/local/bin/zsign && \
    rm -rf /tmp/zsign

# Copy relay server files
COPY relay-server.js sign-ipa.sh package*.json ./
RUN chmod +x sign-ipa.sh

# Install only production dependencies
RUN npm ci --omit=dev

# Expose the relay server port
EXPOSE 3000

# Start the relay server
CMD ["node", "relay-server.js"]
