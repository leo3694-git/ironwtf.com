# Use lightweight official Node image
FROM node:18-alpine

# Set working directory inside container
WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install production dependencies only
RUN npm ci --omit=dev

# Copy application source code
COPY server.js ./
COPY public/ ./public/

# Expose port 8080 (Cloud Run standard)
EXPOSE 8080

# Configure environment variables
ENV PORT=8080
ENV NODE_ENV=production

# Start Express server
CMD ["npm", "start"]
