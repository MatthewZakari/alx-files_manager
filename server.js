import express from 'express';
import routes from './routes/index';
import redisClient from './utils/redis';  /* Import the Redis client */

const app = express();
const port = process.env.PORT || 5000;

app.use(express.json());
app.use(routes);

/* Ensure Redis is connected before starting the server */
redisClient.connect().then(() => {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}).catch((error) => {
  console.error('Failed to connect to Redis. Exiting...');
  process.exit(1); /* Exit the process if Redis connection fails */
});

