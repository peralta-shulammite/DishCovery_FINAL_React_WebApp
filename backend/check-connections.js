// check-connections.js
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config();

async function testDatabaseConnection() {
  console.log("🚀 Starting detailed database connection test...");

  let connection;
  try {
    console.log("🔹 Step 1: Checking environment variables...");
    const requiredVars = ['DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME', 'DB_SSL'];
    requiredVars.forEach(v => {
      if (!process.env[v]) throw new Error(`${v} is missing in .env`);
    });

    console.log(`🔹 Step 2: Connecting to ${process.env.DB_HOST}:${process.env.DB_PORT} as ${process.env.DB_USER}...`);

    const useSSL = process.env.DB_SSL === 'true';

    try {
      const sslOptions = useSSL
        ? {
            // Use Aiven CA if available
            // ca: fs.readFileSync('./aiven-ca.pem'), // uncomment if you have the PEM
            rejectUnauthorized: true,
          }
        : false;

      connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: sslOptions,
      });

      console.log(useSSL ? "✅ Connected with SSL!" : "✅ Connected without SSL!");
    } catch (sslErr) {
      if (useSSL) {
        console.warn("⚠ SSL connection failed, retrying with rejectUnauthorized: false...");
        connection = await mysql.createConnection({
          host: process.env.DB_HOST,
          port: process.env.DB_PORT,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          ssl: { rejectUnauthorized: false },
        });
        console.log("✅ Connected with SSL (unverified)!");
      } else {
        throw sslErr;
      }
    }

    console.log("🔹 Step 3: Running test query...");
    // Use backticks to prevent syntax errors
    const [rows] = await connection.query("SELECT NOW() AS `current_time`");
    console.log("✅ Test query successful! Current DB time:", rows[0].current_time);

    console.log("🎉 Database connection fully verified!");
  } catch (err) {
    console.error("❌ Connection test failed at step:", err.message);
    console.error(err);
  } finally {
    if (connection) {
      await connection.end();
      console.log("🔹 Connection closed.");
    }
  }
}

testDatabaseConnection();
