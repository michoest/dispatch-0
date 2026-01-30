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
        PORT: 3100
      },
      error_file: 'logs/dispatcher-error.log',
      out_file: 'logs/dispatcher-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'calendar-service',
      script: 'dummy-services/calendar-service/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
        PORT: 3101,
        API_KEY: 'calendar-secret-key',
        BASE_URL: 'https://calendar.michoest.com'
      },
      error_file: 'logs/calendar-error.log',
      out_file: 'logs/calendar-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'reminder-service',
      script: 'dummy-services/reminder-service/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
        PORT: 3102,
        API_KEY: 'reminder-secret-key',
        BASE_URL: 'https://reminders.michoest.com'
      },
      error_file: 'logs/reminder-error.log',
      out_file: 'logs/reminder-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    },
    {
      name: 'weather-service',
      script: 'dummy-services/weather-service/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '200M',
      env: {
        NODE_ENV: 'production',
        PORT: 3103,
        API_KEY: 'weather-secret-key',
        BASE_URL: 'https://weather.michoest.com'
      },
      error_file: 'logs/weather-error.log',
      out_file: 'logs/weather-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true
    }
  ]
};
