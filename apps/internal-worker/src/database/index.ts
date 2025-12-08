import Database from '@ymh8/database';
import { environment } from '../environment.js';

const database = new Database({
  database: environment.DB,
  password: environment.DB_PASSWORD,
  user: environment.DB_USER,
});

await database.init();

export default database;
