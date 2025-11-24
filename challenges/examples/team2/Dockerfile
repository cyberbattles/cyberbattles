FROM ubuntu:24.04

RUN apt update && \
    apt install vim openssh-server supervisor sudo python3 wireguard curl iproute2 resolvconf iputils-ping tcpdump -y

RUN mkdir /var/run/sshd


RUN echo "root:root" | chpasswd
RUN sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config

WORKDIR /

RUN mkdir challenges
COPY challenges/ challenges/


EXPOSE 8080 22

ENTRYPOINT ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
