module.exports = {
  apps: [
    {
      name: 'mahachi-xd-bot',
      script: './index.js',
      watch: true,               // Auto-restart on changes (disable if unwanted)
      autorestart: true,
      max_restarts: 10,
      restart_delay: 5000,       // 5 seconds delay between restarts
      env: {
        NODE_ENV: 'production',
        NUMBER: '263xxxxxxxx',        // Replace with your bot number (no + or spaces)
        BASE_URL: 'locall host',  // Change if serving media externally
      },
      env_development: {
        NODE_ENV: 'development'
      }
    }
  ]
};