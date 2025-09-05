#!/bin/bash

LOG_FILE="/var/log/wireguard-init.log"

echo "Starting..." >>"$LOG_FILE"

# Use environment variables passed from the container configuration
num_teams=${NUM_TEAMS}
num_players=${NUM_PLAYERS}
server_ip=${SERVER_IP}
wireguard_port=${WIREGUARD_PORT}

# Total peers generated
total_confs=$(((num_teams * num_players) + num_teams))

# Remove unnecessary attribute
for ((i = 1; i <= $total_confs; i++)); do
  sed -i '/^DNS = /d' "/config/peer$i/peer$i.conf"
  sed -i "/ListenPort = ${wireguard_port}/d" /config/peer$i/peer$i.conf
done

# Append PersistentKeepalive to the team
for ((i = 1; i <= $num_teams; i++)); do
  sed -i "/\[Peer\]/a PersistentKeepalive = 25" /config/peer$i/peer$i.conf
done

# Modify endpoint (#TODO server public ip as the endpoint)
peer_index=$((num_teams + 1))
for ((j = $peer_index; j <= $total_confs; j++)); do
  echo $j
  sed -i "s/Endpoint = wg-router:${wireguard_port}/Endpoint = ${server_ip}:${wireguard_port}/" /config/peer$j/peer$j.conf
done

echo "Done" >>"$LOG_FILE"

touch /config/init_done
