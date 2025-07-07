export default () => ({
  env: process.env.NODE_NAME || 'development',
  name: process.env.APP_NAME || 'Boilerplate',
  port: parseInt(process.env.APP_PORT, 10) || 3000,
  corsOrigin: process.env.CORS_ORIGIN,
  api: {
    defaultPageLimit: 10,
    decoratorPermissionKey: 'permission',
  },
  database: {
    type: process.env.DB_CLIENT || 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 3306,
    username: process.env.DB_USERNAME || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'temp_crud',
    seeds: ['src/db/seeders/**/*.seeder.ts'],
    log: true,
  },
  jwt: {
    accessToken: {
      secretKey: process.env.JWT_ACCESS_TOKEN_SECRET_KEY,
      expired: process.env.JWT_ACCESS_TOKEN_EXPIRED,
    },
    refreshToken: {
      secretKey: process.env.JWT_REFRESH_TOKEN_SECRET_KEY,
      expired: process.env.JWT_REFRESH_TOKEN_EXPIRED,
    },
  },
});
