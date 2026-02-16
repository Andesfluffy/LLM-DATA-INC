import { registerConnector } from "./registry";
import { postgresConnector } from "./postgres";
import { mysqlConnector } from "./mysql";
import { sqliteConnector } from "./sqlite";
import { csvConnector } from "./csv";

registerConnector(postgresConnector);
registerConnector(mysqlConnector);
registerConnector(sqliteConnector);
registerConnector(csvConnector);
