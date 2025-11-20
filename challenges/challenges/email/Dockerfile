FROM ubuntu:22.04

RUN apt-get update && apt-get install -y gcc make netcat

WORKDIR /app

COPY server.c .

# Compile with flags to DISABLE security protections for the Overflow vuln
RUN gcc -o vulneramail server.c -fno-stack-protector

EXPOSE 9999

CMD ["./vulneramail"]
