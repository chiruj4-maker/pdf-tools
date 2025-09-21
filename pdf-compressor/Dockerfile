# Use an official Python runtime as a parent image
FROM python:3.9-slim

# Install system dependencies required by Ghostscript
RUN apt-get update && apt-get install -y \
    ghostscript \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory in the container
WORKDIR /app

# Copy the dependencies file to the working directory
COPY requirements.txt .

# Install any needed packages specified in requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the content of the local src directory to the working directory
COPY . .

# Make port 8080 available to the world outside this container
ENV PORT 8080
EXPOSE 8080

# Define environment variables
# GCS_BUCKET, WORKER_SHARED_KEY, FIREBASE_UPDATE_URL will be set by Cloud Run
ENV GOOGLE_CLOUD_PROJECT YOUR_GOOGLE_CLOUD_PROJECT_ID

# Run compressor.py when the container launches
CMD ["python3", "compressor.py"]
