module.exports = {
  apps: [
    {
      name: "cyberbattles-web",
      script: "node_modules/next/dist/bin/next",
      args: "start", 
      watch: false, 
      max_memory_restart: "1G", 
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      }
    }
  ]
};
