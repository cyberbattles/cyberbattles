FROM ubuntu:24.04

RUN apt update && apt upgrade -y && \
    apt install python3 -y

WORKDIR /
COPY run.sh run.sh
RUN chmod +x run.sh

RUN mkdir challenges
COPY challenges/ challenges/

EXPOSE 8080

CMD ["/bin/sh","./run.sh"]
