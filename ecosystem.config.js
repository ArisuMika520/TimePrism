module.exports = {
  apps: [
    {
      name: "timeprism",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      instances: 1,
      exec_mode: "fork",
      cwd: "./",
      env: {
        NODE_ENV: "production",
        PORT: 5000,
      },
      env_production: {
        NODE_ENV: "production",
        PORT: 5000,
      },
      env_development: {
        NODE_ENV: "development",
        PORT: 3000,
      },
      error_file: "./logs/pm2-error.log",
      out_file: "./logs/pm2-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      merge_logs: true,
      autorestart: true,
      max_memory_restart: "1G",
      watch: false,
      ignore_watch: [
        "node_modules",
        "logs",
        ".next",
        ".git",
        "*.log",
        "*.md",
        "tests",
        "scripts",
      ],
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 4000,
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
    },
    {
      name: "timeprism-auto-archive",
      script: "node",
      args: "scripts/auto-archive.js",
      cron_restart: "0 3 * * *", // 每天凌晨3点执行
      autorestart: false,
      watch: false,
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
      },
      error_file: "./logs/auto-archive-error.log",
      out_file: "./logs/auto-archive-out.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
    },
  ],
}

