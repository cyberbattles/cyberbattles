echo "========================================"
echo " Installing Database "
echo "========================================"

# Script should be expanded to accomodate other architectures that are confimed working
wget https://github.com/pocketbase/pocketbase/releases/download/v0.36.6/pocketbase_0.36.6_linux_amd64.zip

unzip pocketbase_0.36.6_linux_amd64.zip

./pocketbase serve --http="0.0.0.0:8090"

echo "========================================"
echo " Creating Service Account... "
echo "========================================"

SYSTEM_EMAIL="admin@cyberbattles.local"
SYSTEM_PASS=$(openssl rand -hex 12)

./pocketbase superuser upsert "$SYSTEM_EMAIL" "$SYSTEM_PASS"

ENV_FILE="../backend/.env"
echo "PB_ADMIN_EMAIL=$SYSTEM_EMAIL" >"$ENV_FILE"
echo "PB_ADMIN_PASSWORD=$SYSTEM_PASS" >>"$ENV_FILE"

echo "========================================"
echo " Installation Complete! "
echo "========================================"
echo ""
echo "--- Pocketbase Admin Dashboard Login ---"
echo "URL:      http://<your-server-ip>:8090/_/"
echo "DefaultEmail:    $SYSTEM_EMAIL"
echo "DefaultPassword: $SYSTEM_PASS"
echo "-----------------------------"
echo ""
