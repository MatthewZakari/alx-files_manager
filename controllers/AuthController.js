import redisClient from '../utils/redis';
import dbClient from '../utils/db';
import sha1 from 'sha1';
import { v4 as uuidv4 } from 'uuid';

class AuthController {
  static async getConnect(req, res) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Basic ')) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const base64 = authHeader.split(' ')[1];
      const [email, password] = Buffer.from(base64, 'base64').toString().split(':');
      if (!email || !password) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const hashedPassword = sha1(password);
      const user = await dbClient.db.collection('users').findOne({ email, password: hashedPassword });
      if (!user) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const token = uuidv4();
      await redisClient.set(`auth_${token}`, user._id.toString(), 24 * 3600);

      return res.status(200).json({ token });
    } catch (error) {
      console.error('Error in getConnect:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getDisconnect(req, res) {
    try {
      const token = req.headers['x-token'];
      if (!token) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      await redisClient.del(`auth_${token}`);
      return res.status(204).send();
    } catch (error) {
      console.error('Error in getDisconnect:', error);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

export default AuthController;

