# Simple Dockerfile for relay server only
FROM node:18-slim

WORKDIR /app

# Copy only the files needed for the relay server
COPY relay-server.js package*.json ./

# Install only production dependencies
RUN npm ci --omit=dev

# Expose the relay server port
EXPOSE 3000

# Start the relay server
CMD ["node", "relay-server.js"]
