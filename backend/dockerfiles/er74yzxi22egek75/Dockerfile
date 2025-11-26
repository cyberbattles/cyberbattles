FROM ubuntu:24.04

RUN apt-get update && \
  apt-get install -y vim netcat-traditional iputils-ping openssh-server sudo supervisor python3 python3-flask python3-pip python3-sqlalchemy python3-werkzeug gcc make wireguard curl iproute2 tcpdump netcat-openbsd

RUN mkdir /var/run/sshd
RUN echo "root:root" | chpasswd
RUN sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config

WORKDIR /challenges/skymail
COPY /challenges/skymail/ .
RUN gcc -o skymail server.c -fno-stack-protector
RUN chmod +x skymail 
RUN mkdir data

WORKDIR /challenges/skyrewards
COPY /challenges/skyrewards/ .
RUN pip install --no-cache-dir --break-system-packages -r requirements.txt

COPY supervisord.conf /etc/supervisord.conf

WORKDIR /challenges

RUN printf 'echo -e "\e[1;32mWelcome to Skyline Corp Network!\e[0m\n\e[1;34mServices running: SkyMail (tcp 9999), SkyRewards (http 5000)\e[0m"' >> /etc/bash.bashrc
RUN printf 'echo -e "\e[1;32mWelcome!\e[0m\n\e[1;34mChallenges are under /challenges folder.\e[0m\n\e[1;33mMake sure to restart the service with \`supervisorctl restart <challenge_name>\` after patching the program.\e[0m"' >> /etc/bash.bashrc

EXPOSE 5000 9999 22

ENTRYPOINT ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
