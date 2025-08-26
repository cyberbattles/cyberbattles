# Temporary Test Dockerfile

FROM ubuntu:latest

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && \
  apt-get install -y sudo && \
  rm -rf /var/lib/apt/lists/*

CMD ["/bin/bash"]

