import redisClient from '../utils/redis';
import dbClient from '../utils/db';

class AppController {
  /**
   * Returns the status of Redis and the database.
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   */
  static getStatus(req, res) {
    res.status(200).json({
      redis: redisClient.isAlive(),
      db: dbClient.isAlive(),
    });
  }

  /**
   * Returns the count of users and files in the database.
   * Handles potential errors in the database connection or queries.
   * @param {object} req - The request object.
   * @param {object} res - The response object.
   */
  static async getStats(req, res) {
    try {
      const users = await dbClient.nbUsers();
      const files = await dbClient.nbFiles();

      res.status(200).json({ users, files });
    } catch (error) {
      console.error('Error fetching stats:', error);
      res.status(500).json({ error: 'Unable to retrieve stats' });
    }
  }
}

export default AppController;

