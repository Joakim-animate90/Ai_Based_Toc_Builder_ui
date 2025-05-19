FROM python:3.9-slim

# Define build arguments
ARG API_URL=http://localhost:8000

WORKDIR /app

# Install Node.js and npm
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    && curl -sL https://deb.nodesource.com/setup_16.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy frontend source files
COPY templates/ ./templates/

# Install npm dependencies and build frontend assets
WORKDIR /app/templates
RUN npm install && npm run build

# Go back to the app directory
WORKDIR /app

# Copy the rest of the application
COPY . .

# Create uploads directory
RUN mkdir -p uploads/large_files

# Expose the port the app runs on
EXPOSE 5000

# Set environment variables
ENV FLASK_APP=app.py
ENV PYTHONUNBUFFERED=1
ENV API_URL=${API_URL}

# Command to run the application with Gunicorn for better production performance
CMD ["gunicorn", "--config", "gunicorn_config.py", "app:app"]
