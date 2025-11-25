FROM python:3.13-slim-bullseye

WORKDIR /app

RUN apt-get update && \
  apt-get install --no-install-recommends -y supervisor wireguard iproute2 && \
  rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir requests flask

COPY email_flag_service.py .
COPY skyrewards_flag_service.py .

COPY supervisord.conf /etc/supervisord.conf

EXPOSE 8081 8082

ENTRYPOINT ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
