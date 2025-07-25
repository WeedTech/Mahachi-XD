module.exports = {
  apps: [
    {
      name: 'mahachi-xd-bot',
      script: './index.js',
      instances: 1,
      exec_mode: 'cluster',
      watch: false, // Set to true for development, false for production
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
      cwd: './',
      args: '',
      interpreter: 'node',
      
      // Error handling
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      log_type: 'json',
      
      // Environment variables
      env: {
        NODE_ENV: 'production',
        NUMBER: '263xxxxxxxx', // Replace with your bot number (no + or spaces)
        BASE_URL: 'localhost', // Change if serving media externally
        PORT: 3000,
        LOG_LEVEL: 'info',
        MAX_CONCURRENT_TASKS: 5,
        RESPONSE_TIMEOUT: 30000,
        RECONNECT_INTERVAL: 5000,
        MAX_RECONNECT_ATTEMPTS: 5
      },
      
      env_development: {
        NODE_ENV: 'development',
        NUMBER: '263xxxxxxxx',
        BASE_URL: 'localhost',
        PORT: 3000,
        LOG_LEVEL: 'debug',
        WATCH: true
      },
      
      env_staging: {
        NODE_ENV: 'staging',
        NUMBER: '263xxxxxxxx',
        BASE_URL: 'staging.example.com',
        PORT: 3000,
        LOG_LEVEL: 'info'
      },
      
      env_production: {
        NODE_ENV: 'production',
        NUMBER: '263xxxxxxxx',
        BASE_URL: 'yourdomain.com',
        PORT: 80,
        LOG_LEVEL: 'error'
      }
    }
  ],
  
  // Deployment configuration (optional)
  deploy: {
    production: {
      user: 'deploy',
      host: 'your-server.com',
      ref: 'origin/main',
      repo: 'git@github.com:WeedTech/Mahachi-XD.git',
      path: '/var/www/mahachi-xd',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};