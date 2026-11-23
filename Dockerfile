FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN useradd -m appuser

# Install Python dependencies globally
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code with ownership
COPY --chown=appuser:appuser backend/ ./backend/

USER appuser

EXPOSE 8000

ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app/backend

# Start the application binding to Render $PORT dynamically
CMD ["sh", "-c", "python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
