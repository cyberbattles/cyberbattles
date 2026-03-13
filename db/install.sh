# Script should be expanded to accomodate other architectures that are confimed working
wget https://github.com/pocketbase/pocketbase/releases/download/v0.36.6/pocketbase_0.36.6_linux_amd64.zip

unzip pocketbase_0.36.6_linux_amd64.zip

./pocketbase serve --http="0.0.0.0:8090"
