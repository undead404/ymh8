import { getKysely } from '@ymh8/database';
import { environment } from '../environment.js';

const kysely = getKysely({
  database: environment.DB,
  password: environment.DB_PASSWORD,
  user: environment.DB_USER,
});

export default kysely;
