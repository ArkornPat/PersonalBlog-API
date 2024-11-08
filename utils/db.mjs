import * as pg from "pg";
const { Pool } = pg.default;

const pool = new Pool({
  connectionString:
    "postgresql://postgres:Petch@1234@localhost:5432/blogpost",
});

export { pool };