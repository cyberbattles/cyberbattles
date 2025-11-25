FROM python:3.13-slim-bullseye

ENV ADMIN_TOKEN="yLetRzCWJZTs0v6LYs63S5hHwtf6Tp"

WORKDIR /

COPY requirements.txt .

RUN pip install --no-cache-dir --upgrade pip
RUN pip install --no-cache-dir -r requirements.txt

COPY flags.py .

RUN apt-get update && \
  apt-get install --no-install-recommends -y \
  supervisor \
  wireguard \
  curl \
  iproute2 && \
  rm -rf /var/lib/apt/lists/*

# Create a directory for the sqlite db
RUN mkdir -p instance

EXPOSE 8080

ENTRYPOINT ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
