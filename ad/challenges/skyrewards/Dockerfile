FROM python:3.9-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create a directory for the sqlite db
RUN mkdir -p instance

# Expose the port
EXPOSE 5000

# Run the application
CMD ["python", "app.py"]