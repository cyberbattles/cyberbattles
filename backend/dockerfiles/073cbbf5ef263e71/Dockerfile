FROM ubuntu:24.04

RUN apt update && \
  apt install tcpdump vim openssh-server supervisor sudo wireguard curl iproute2 resolvconf iputils-ping tcpdump -y

RUN mkdir /var/run/sshd

RUN echo "root:root" | chpasswd
RUN sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config

WORKDIR /

COPY supervisord.conf /etc/supervisord.conf

EXPOSE 22

ENTRYPOINT ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
