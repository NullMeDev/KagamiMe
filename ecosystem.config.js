module.exports = {
  apps: [{
    name: "kagamime",
    script: "dist/index.js",
    watch: ["dist"],
    ignore_watch: ["node_modules", "logs"],
    env: {
      NODE_ENV: "production"
    },
    max_memory_restart: "1G",
    error_file: "logs/error.log",
    out_file: "logs/output.log",
    time: true,
    restart_delay: 4000,
    max_restarts: 10
  }]
};
