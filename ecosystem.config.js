module.exports = {
  apps: [
    {
      name: "timeprism",
      script: "npm",
      args: "start",
      instances: "max", // 使用所有CPU核心
      exec_mode: "cluster", // 集群模式
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      max_memory_restart: "1G",
      watch: false,
      ignore_watch: ["node_modules", "logs", ".next"],
      min_uptime: "10s",
      max_restarts: 10,
    },
    {
      name: "timeprism-auto-archive",
      script: "node",
      args: "scripts/auto-archive.js",
      cron_restart: "0 3 * * *",
      autorestart: false,
      watch: false,
      env: {
        NODE_ENV: "production",
      },
    },
  ],
}

