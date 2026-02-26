import { Sequelize } from 'sequelize';
import * as pg from 'pg';

const isSslRequired =
  process.env.PGSSLMODE === 'require' ||
  process.env.NODE_ENV === 'production';

const sequelize = new Sequelize({
  dialect: 'postgres',
  dialectModule: pg,
  host: process.env.PGHOST || '/var/run/postgresql',
  port: parseInt(process.env.PGPORT || '5432', 10),
  username: process.env.PGUSER || 'whygwn',
  password: process.env.PGPASSWORD || undefined,
  database: process.env.PGDATABASE || 'whygwn_db',
  logging: false,
  dialectOptions: isSslRequired
    ? {
        ssl: {
          require: true,
          rejectUnauthorized: false,
        },
      }
    : undefined,
  define: {
    underscored: true,
    timestamps: true,
  },
});

export default sequelize;
