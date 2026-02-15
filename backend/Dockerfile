# Use official Node.js LTS image
FROM node:18

# Set working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first to install dependencies
COPY package*.json ./

# Install dependencies
RUN npm install

# Install nodemon globally (for auto-reloading)
RUN npm install -g nodemon

# Copy the rest of the backend code
COPY . .

# Expose port 3000 for the API
EXPOSE 3000

# Default command to start the server with nodemon
CMD ["npx", "nodemon", "server.js"]
