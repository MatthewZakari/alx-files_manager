import { createClient } from 'redis';

class RedisClient {
    constructor() {
        this.client = createClient();  /* Create Redis client */

        this.client.on('error', (err) => {
            console.error('Redis Client Error:', err);
        });
    }

    /* Check if the Redis client is connected */
    isAlive() {
        return this.client.isOpen;  /* Use 'isOpen' for new redis client */
    }

    /* Connect to Redis server */
    async connect() {
        try {
            await this.client.connect();
            console.log('Connected to Redis');
        } catch (error) {
            console.error('Error connecting to Redis:', error);
        }
    }

    /* Set a key-value pair in Redis */
    async set(key, value) {
        try {
            await this.client.set(key, value);
        } catch (error) {
            console.error('Error setting key in Redis:', error);
        }
    }

    /* Get a value by key from Redis */
    async get(key) {
        try {
            return await this.client.get(key);
        } catch (error) {
            console.error('Error getting key from Redis:', error);
        }
    }
}

const redisClient = new RedisClient();
export default redisClient;

