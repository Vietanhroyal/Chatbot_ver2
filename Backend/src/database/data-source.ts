import { DataSource, DataSourceOptions } from 'typeorm'

const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'myuser',
  password: process.env.DB_PASSWORD || 'mypassword',
  database: process.env.DB_NAME || 'rag_db',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  synchronize: false,
}

export const AppDataSource = new DataSource(dataSourceOptions)