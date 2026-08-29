import app from "../src/app.js";
import { connectDB } from "../src/config/db.js";

let isDbConnected = false;

export default async function handler(req, res) {
  if (!isDbConnected && process.env.MONGO_URI) {
    try {
      await connectDB();
      isDbConnected = true;
    } catch (err) {
      console.error("[Vercel Serverless] DB connection error:", err.message);
    }
  }
  return app(req, res);
}
