import sha1 from 'sha1';
import dbClient from '../utils/db';
import Queue from 'bull';

const userQueue = new Queue('userQueue');

class UsersController {
  static async postNew(req, res) {
    const { email, password } = req.body;
 
    /* Validate input fields */
    if (!email) return res.status(400).json({ error: 'Missing email' });
    if (!password) return res.status(400).json({ error: 'Missing password' });

    const usersCollection = dbClient.db.collection('users');

    /* Check if user already exists */
    const userExists = await usersCollection.findOne({ email });
    if (userExists) return res.status(400).json({ error: 'Already exists' });

    try {
      /* Hash password and create user */
      const hashedPassword = sha1(password);
      const result = await usersCollection.insertOne({ email, password: hashedPassword });

      /* Add user to the queue for further processing */
      userQueue.add({ userId: result.insertedId });

      /* Respond with success */
      return res.status(201).json({ id: result.insertedId, email });
    } catch (error) {
      /* Handle database or server errors */
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export default UsersController;

