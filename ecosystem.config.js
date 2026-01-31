module.exports = {
  apps: [
    {
      name: 'dispatcher',
      script: 'src/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 3003
      },
      error_file: 'logs/dispatcher-error.log',
      out_file: 'logs/dispatcher-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
