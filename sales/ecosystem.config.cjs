module.exports = {
  apps: [
    {
      name: 'sales-dashboard-frontend',
      script: '/root/.nvm/versions/node/v20.19.5/bin/npm',
      args: 'run dev',
      cwd: '/var/www/sales_dashboard_excel',
      env: {
        PORT: 4000,
        VITE_PORT: 4000,
        PATH: '/root/.nvm/versions/node/v20.19.5/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'sales-dashboard-api',
      script: '/root/.nvm/versions/node/v20.19.5/bin/npm',
      args: 'run start',
      cwd: '/var/www/sales_dashboard_excel/backend',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        PATH: '/root/.nvm/versions/node/v20.19.5/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'
      },
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '1G',
      restart_delay: 3000
    }
  ]
};
