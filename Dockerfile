# Use an official Node.js runtime as a parent image
FROM node:16

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code
COPY . .

# Compile the TypeScript code
RUN npm run build

# Make port 3000 available to the world outside this container
EXPOSE 3000

# Define the environment variable
ENV CONNECTION_STRING=mongodb://mongo:27017/unodb

# Run the app
CMD ["npm", "start"]
