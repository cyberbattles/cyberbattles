# ===
# Dockerfile template
# 
# * Challenge folder is copied to team's folder due to docker only allows files inside the build context
# * Currently, the run.sh is used for challenges initialisation. (start challenge service, launch challenge)
# 
# ===

# Base os
FROM ubuntu:24.04

# Install dependences
RUN apt update && apt upgrade -y && \
    apt install python3 -y

# Copy chellenge folders (challenges, public key and env...)
WORKDIR /
COPY run.sh run.sh
RUN chmod +x run.sh

RUN mkdir challenges
COPY challenges/ challenges/

# List of ports 8080,433,21...
EXPOSE {ports}

# Start all services
CMD ["/bin/sh","./run.sh"]
