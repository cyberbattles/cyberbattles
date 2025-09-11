#!/bin/bash

LOG_FILE="/var/log/wireguard-init.log"
SERVER_CONF="/config/wg_confs/wg0.conf"

echo "Starting..." >> "$LOG_FILE"

sed -i "/\[Interface\]/a PostUp = iptables -t nat -A POSTROUTING -o wg+ -j MASQUERADE" $SERVER_CONF
sed -i "/\[Interface\]/a PostUp = iptables -A FORWARD -i wg0 -o wg0 -p tcp --dport 22 -j DROP" $SERVER_CONF
# For multiple source ips -s 10.12.0.4,10.12.0.5. Only team member can ssh into their own machine
sed -i "/\[Interface\]/a PostUp = iptables -A FORWARD -i wg0 -o wg0 -p tcp -s 10.12.0.4 -d 10.12.0.2 --dport 22 -j ACCEPT" $SERVER_CONF
sed -i "/\[Interface\]/a PostUp = iptables -A FORWARD -i wg0 -o wg0 -p tcp -s 10.12.0.5 -d 10.12.0.3 --dport 22 -j ACCEPT" $SERVER_CONF

# The first {num_team} peers are for containers and the rest are for the players.
num_teams=2
num_players=1

# Total peers generated
total_confs=$(((num_teams * num_players) + num_teams))

# Remove unnecessary attribute
for ((i = 1; i <= $total_confs; i++)); do
  sed -i '/DNS = 8.8.8.8/d' /config/peer$i/peer$i.conf
  sed -i '/ListenPort = 51820/d' /config/peer$i/peer$i.conf
done

# Append PersistentKeepalive to the team
for ((i = 1; i <= $num_teams; i++)); do
  sed -i "/\[Peer\]/a PersistentKeepalive = 25" /config/peer$i/peer$i.conf
done

# Modify endpoint (#TODO server public ip as the endpoint)
peer_index=$((num_teams + 1))
for ((j = $peer_index; j <= $total_confs; j++)); do
  echo $j
  sed -i 's/Endpoint = wg-router:51820/Endpoint = 172.12.0.200:51820/' /config/peer$j/peer$j.conf
done

echo "Done" >> "$LOG_FILE"

touch /config/init_done
