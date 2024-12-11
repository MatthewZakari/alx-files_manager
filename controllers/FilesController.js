import dbClient from '../utils/db';
import redisClient from '../utils/redis';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs/promises';
import path from 'path';
import mime from 'mime-types';
import Queue from 'bull';
import { ObjectId } from 'mongodb';

const fileQueue = new Queue('fileQueue');

class FilesController {
  static async postUpload(req, res) {
    try {
      const token = req.headers['x-token'];
      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { name, type, isPublic = false, parentId = 0, data } = req.body;
      if (!name) return res.status(400).json({ error: 'Missing name' });
      if (!type || !['folder', 'file', 'image'].includes(type)) return res.status(400).json({ error: 'Missing type' });
      if (type !== 'folder' && !data) return res.status(400).json({ error: 'Missing data' });

      const filesCollection = dbClient.db.collection('files');
      if (parentId !== 0) {
        const parentFile = await filesCollection.findOne({ _id: ObjectId(parentId) });
        if (!parentFile) return res.status(400).json({ error: 'Parent not found' });
        if (parentFile.type !== 'folder') return res.status(400).json({ error: 'Parent is not a folder' });
      }

      const newFile = { userId, name, type, isPublic, parentId };
      if (type === 'folder') {
        const result = await filesCollection.insertOne(newFile);
        return res.status(201).json({ id: result.insertedId, ...newFile });
      }

      const folderPath = process.env.FOLDER_PATH || '/tmp/files_manager';
      await fs.mkdir(folderPath, { recursive: true });

      const filePath = path.join(folderPath, uuidv4());
      await fs.writeFile(filePath, Buffer.from(data, 'base64'));

      newFile.localPath = filePath;
      const result = await filesCollection.insertOne(newFile);

      if (type === 'image') fileQueue.add({ userId, fileId: result.insertedId });
      return res.status(201).json({ id: result.insertedId, ...newFile });
    } catch (err) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getShow(req, res) {
    try {
      const token = req.headers['x-token'];
      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { id } = req.params;
      const filesCollection = dbClient.db.collection('files');

      const file = await filesCollection.findOne({ _id: ObjectId(id), userId });
      if (!file) return res.status(404).json({ error: 'Not found' });

      return res.status(200).json(file);
    } catch (err) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getIndex(req, res) {
    try {
      const token = req.headers['x-token'];
      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { parentId = 0, page = 0 } = req.query;
      const filesCollection = dbClient.db.collection('files');

      const files = await filesCollection
        .aggregate([
          { $match: { parentId: Number(parentId), userId } },
          { $skip: Number(page) * 20 },
          { $limit: 20 },
        ])
        .toArray();

      return res.status(200).json(files);
    } catch (err) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async putPublish(req, res) {
    try {
      const token = req.headers['x-token'];
      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { id } = req.params;
      const filesCollection = dbClient.db.collection('files');

      const file = await filesCollection.findOne({ _id: ObjectId(id), userId });
      if (!file) return res.status(404).json({ error: 'Not found' });

      await filesCollection.updateOne({ _id: ObjectId(id) }, { $set: { isPublic: true } });

      const updatedFile = await filesCollection.findOne({ _id: ObjectId(id) });
      return res.status(200).json(updatedFile);
    } catch (err) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async putUnpublish(req, res) {
    try {
      const token = req.headers['x-token'];
      const userId = await redisClient.get(`auth_${token}`);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });

      const { id } = req.params;
      const filesCollection = dbClient.db.collection('files');

      const file = await filesCollection.findOne({ _id: ObjectId(id), userId });
      if (!file) return res.status(404).json({ error: 'Not found' });

      await filesCollection.updateOne({ _id: ObjectId(id) }, { $set: { isPublic: false } });

      const updatedFile = await filesCollection.findOne({ _id: ObjectId(id) });
      return res.status(200).json(updatedFile);
    } catch (err) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  static async getFile(req, res) {
    try {
      const { id } = req.params;
      const { size } = req.query;
      const token = req.headers['x-token'];
      const userId = await redisClient.get(`auth_${token}`);

      const filesCollection = dbClient.db.collection('files');
      const file = await filesCollection.findOne({ _id: ObjectId(id) });

      if (!file) return res.status(404).json({ error: 'Not found' });
      if (!file.isPublic && (!userId || file.userId !== userId))
        return res.status(404).json({ error: 'Not found' });

      if (file.type === 'folder')
        return res.status(400).json({ error: "A folder doesn't have content" });

      let filePath = file.localPath;
      if (size) filePath = `${filePath}_${size}`;

      try {
        const mimeType = mime.lookup(file.name) || 'application/octet-stream';
        res.setHeader('Content-Type', mimeType);
        return res.status(200).sendFile(filePath);
      } catch {
        return res.status(404).json({ error: 'Not found' });
      }
    } catch (err) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}

export default FilesController;

