# Use Node.js 18 Alpine for a small, efficient image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy backend package files first (to leverage Docker cache)
COPY backend/package*.json ./backend/

# Install dependencies in the backend folder
RUN cd backend && npm install --production

# Copy the entire project (includes backend and frontend)
COPY . .

# Set working directory to backend to run the server
WORKDIR /app/backend

# Expose the application port
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
