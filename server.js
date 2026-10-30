import app from './app.js';
import { connectToDb } from './src/db/connect.js';

const PORT = process.env.PORT;

if (!PORT) {
  throw new Error('PORT is required. Use the local npm scripts to load .env, or set PORT in your hosting environment.');
}

const startServer = async () => {
  try {
    await connectToDb();
    app.listen(PORT, () => {
      console.log(`Server listening on port ${PORT}`);
    });
  } catch {
    console.error('Server startup failed. Check MongoDB configuration and network access.');
    process.exit(1);
  }
};

await startServer();
