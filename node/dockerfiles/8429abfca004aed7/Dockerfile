FROM ubuntu:24.04

RUN apt update && \
  apt install vim openssh-server supervisor python3 python3-flask wireguard curl iproute2 tcpdump -y

RUN mkdir /var/run/sshd


RUN echo "root:root" | chpasswd
RUN sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config

WORKDIR /

RUN mkdir challenges
COPY challenges/ challenges/

COPY supervisord.conf /etc/supervisord.conf

RUN echo 'echo -e "\e[1;32mWelcome!\e[0m\n\e[1;34mChallenges are under /challenges folder.\e[0m\n\e[1;33mMake sure to restart the service with \`supervisorctl restart <challenge name>\` after patching the program.\e[0m"' >> /etc/bash.bashrc

EXPOSE 5000 22

ENTRYPOINT ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
