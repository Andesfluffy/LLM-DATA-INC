declare module "sql.js/dist/sql-asm.js" {
  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database;
  }
  interface Database {
    run(sql: string, params?: any[]): Database;
    exec(sql: string, params?: any[]): QueryExecResult[];
    prepare(sql: string): Statement;
    close(): void;
  }
  interface Statement {
    run(params?: any[]): void;
    free(): void;
  }
  interface QueryExecResult {
    columns: string[];
    values: any[][];
  }
  export default function initSqlJs(): Promise<SqlJsStatic>;
}

declare module "sql.js" {
  interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database;
  }

  interface Database {
    run(sql: string, params?: any[]): Database;
    exec(sql: string, params?: any[]): QueryExecResult[];
    close(): void;
  }

  interface QueryExecResult {
    columns: string[];
    values: any[][];
  }

  interface SqlJsInitOptions {
    locateFile?: (filename: string) => string;
  }

  export default function initSqlJs(options?: SqlJsInitOptions): Promise<SqlJsStatic>;
}
