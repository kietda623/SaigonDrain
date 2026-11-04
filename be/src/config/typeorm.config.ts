import { ConfigService } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { Logger } from '@nestjs/common';
import { Client } from 'pg';
import * as path from 'path';

const logger = new Logger('TypeOrmConfig');

async function verifyAndEnsurePostgresDatabase(
  host: string,
  port: number,
  user: string,
  password: string,
  database: string,
): Promise<{ ok: boolean; reason?: string }> {
  const adminClient = new Client({
    host,
    port,
    user,
    password,
    database: 'postgres',
    connectionTimeoutMillis: 2000,
  });

  try {
    await adminClient.connect();
    const res = await adminClient.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [database],
    );
    if (res.rowCount === 0) {
      logger.log(`Đang tự động tạo database PostgreSQL "${database}"...`);
      await adminClient.query(`CREATE DATABASE "${database}"`);
      logger.log(`Đã tạo database "${database}" thành công!`);
    }
    await adminClient.end();
    return { ok: true };
  } catch (err) {
    try {
      await adminClient.end();
    } catch {
      // ignore
    }
    return { ok: false, reason: (err as Error).message };
  }
}

export async function createTypeOrmOptions(
  configService: ConfigService,
): Promise<TypeOrmModuleOptions> {
  const dbType = configService.get<string>('DB_TYPE', 'postgres');
  const host = configService.get<string>('DB_HOST', 'localhost');
  const port = Number(configService.get<number>('DB_PORT', 5432));
  const username = configService.get<string>('DB_USERNAME', 'postgres');
  const password = configService.get<string>('DB_PASSWORD', 'postgres');
  const database = configService.get<string>('DB_DATABASE', 'saigondrain');
  const synchronize =
    configService.get<string>('DB_SYNCHRONIZE', 'true') === 'true';

  if (dbType === 'postgres') {
    const check = await verifyAndEnsurePostgresDatabase(
      host,
      port,
      username,
      password,
      database,
    );
    if (check.ok) {
      logger.log(`Đã kết nối thành công tới PostgreSQL tại ${host}:${port}/${database}`);
      return {
        type: 'postgres',
        host,
        port,
        username,
        password,
        database,
        autoLoadEntities: true,
        synchronize,
      };
    }

    logger.warn(
      `Không thể đăng nhập PostgreSQL tại ${host}:${port} (${check.reason}). ` +
        `Nếu muốn dùng PostgreSQL trên máy, hãy sửa đúng DB_PASSWORD trong file .env. ` +
        `Hệ thống đang tự động dùng SQLite cục bộ (saigondrain.sqlite) để chạy ngay lập tức!`,
    );
  }

  return {
    type: 'sqljs',
    location: path.resolve(process.cwd(), 'saigondrain.sqlite'),
    autoSave: true,
    autoLoadEntities: true,
    synchronize: true,
  };
}
