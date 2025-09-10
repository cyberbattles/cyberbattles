#!/bin/bash

LOG_FILE="/var/log/wireguard-init.log"
SERVER_CONF="/config/wg_confs/wg0.conf"
IP_PREFIX="10.12.0"

echo "Starting..." >>"$LOG_FILE"

# Use environment variables passed from the container configuration
num_teams=${NUM_TEAMS}
num_players=${NUM_PLAYERS}
server_ip=${SERVER_IP}
wireguard_port=${WIREGUARD_PORT}
team_ids=${TEAM_IDS}

# Calculate total number of configurations
total_confs=$(((num_teams * num_players) + num_teams))

# Add the static NAT and default-deny SSH rules
sed -i "/\[Interface\]/a PostUp = iptables -t nat -A POSTROUTING -o wg+ -j MASQUERADE" $SERVER_CONF
sed -i "/\[Interface\]/a PostUp = iptables -A FORWARD -i wg0 -o wg0 -p tcp --dport 22 -j DROP" $SERVER_CONF

# Add rules to allow each player to SSH into their own team's container
player_index_offset=0
for ((t = 0; t < num_teams; t++)); do
  # Team's IP is based on its index
  team_ip_octet=$((t + 2))
  team_ip="${IP_PREFIX}.${team_ip_octet}"

  for ((p = 0; p < num_players; p++)); do
    # Player's IP is calculated based on its overall index after all team IPs
    player_ip_octet=$((num_teams + player_index_offset + 2))
    player_ip="${IP_PREFIX}.${player_ip_octet}"

    # Construct and add the specific ACCEPT rule for this player-to-team connection
    rule="PostUp = iptables -A FORWARD -i wg0 -o wg0 -p tcp -s ${player_ip} -d ${team_ip} --dport 22 -j ACCEPT"
    sed -i "/\[Interface\]/a ${rule}" $SERVER_CONF

    echo "Allowing SSH from ${player_ip} to ${team_ip}" >>"$LOG_FILE"

    ((player_index_offset++))
  done
done

# Remove DNS, and modify ListenPort in each configuration
for ((i = 1; i <= $total_confs; i++)); do
  sed -i '/^DNS = /d' "/config/peer$i/peer$i.conf"
  sed -i "/ListenPort = ${wireguard_port}/d" /config/peer$i/peer$i.conf
done

# Append PersistentKeepalive to the team
for ((i = 1; i <= $num_teams; i++)); do
  sed -i "/\[Peer\]/a PersistentKeepalive = 25" /config/peer$i/peer$i.conf
done

# Modify Endpoint for players so it points to the correct WG Container
peer_index=$((num_teams + 1))
for ((j = $peer_index; j <= $total_confs; j++)); do
  echo $j
  sed -i "s/Endpoint = wg-router:${wireguard_port}/Endpoint = ${server_ip}:${wireguard_port}/" /config/peer$j/peer$j.conf
done

echo "Renaming configuration folders..." >>"$LOG_FILE"

# Read the space-separated team IDs into a bash array
read -r -a team_ids_array <<<"$team_ids"

# Rename the team container folders
for ((i = 1; i <= $num_teams; i++)); do
  team_id=${team_ids_array[$((i - 1))]}

  old_dir="/config/peer$i"
  new_name="container-${team_id}"
  new_dir="/config/${new_name}"

  # Check if the old directory exists before trying to move it
  if [ -d "$old_dir" ]; then
    # Rename the entire directory
    mv "$old_dir" "$new_dir"
    echo "Renamed directory $old_dir to $new_dir" >>"$LOG_FILE"

    # Rename the files inside
    mv "${new_dir}/peer${i}.conf" "${new_dir}/wg0.conf"
    mv "${new_dir}/peer${i}.png" "${new_dir}/wg0.png"
    mv "${new_dir}/presharedkey-peer${i}" "${new_dir}/presharedkey-wg0"
    mv "${new_dir}/privatekey-peer${i}" "${new_dir}/privatekey-wg0"
    mv "${new_dir}/publickey-peer${i}" "${new_dir}/publickey-wg0"
  fi
done

# Rename the member folders
peer_index=$((num_teams + 1))
for ((j = $peer_index; j <= $total_confs; j++)); do
  # Work out which team the player belongs to
  player_index_offset=$((j - num_teams - 1))
  team_array_index=$((player_index_offset / num_players))
  player_number=$((player_index_offset % num_players + 1))

  # Get the correct team ID from the array
  team_id=${team_ids_array[$team_array_index]}

  old_dir="/config/peer$j"
  new_name="${player_number}-member-${team_id}"
  new_dir="/config/${new_name}"

  # Check if the old directory exists
  if [ -d "$old_dir" ]; then
    # Rename the entire directory
    mv "$old_dir" "$new_dir"
    echo "Renamed directory $old_dir to $new_dir" >>"$LOG_FILE"

    # Rename the files inside
    mv "${new_dir}/peer${j}.conf" "${new_dir}/wg1.conf"
    mv "${new_dir}/peer${j}.png" "${new_dir}/wg1.png"
    mv "${new_dir}/presharedkey-peer${j}" "${new_dir}/presharedkey-wg1"
    mv "${new_dir}/privatekey-peer${j}" "${new_dir}/privatekey-wg1"
    mv "${new_dir}/publickey-peer${j}" "${new_dir}/publickey-wg1"
  fi
done

echo "Done" >>"$LOG_FILE"

touch /config/init_done
