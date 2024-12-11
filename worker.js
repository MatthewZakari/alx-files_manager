import Queue from 'bull';
import imageThumbnail from 'image-thumbnail';
import dbClient from './utils/db';
import fs from 'fs';

const fileQueue = new Queue('fileQueue');
const userQueue = new Queue('userQueue');
 
fileQueue.process(async (job, done) => {
  const { fileId, userId } = job.data;

  if (!fileId) return done(new Error('Missing fileId'));
  if (!userId) return done(new Error('Missing userId'));

  const filesCollection = dbClient.db.collection('files');
  const file = await filesCollection.findOne({ _id: fileId, userId });

  if (!file) return done(new Error('File not found'));

  try {
    const thumbnailSizes = [500, 250, 100];
    for (const size of thumbnailSizes) {
      const thumbnail = await imageThumbnail(file.localPath, { width: size });
      fs.writeFileSync(`${file.localPath}_${size}`, thumbnail);
    }
    done();
  } catch (error) {
    done(new Error(`Thumbnail creation failed: ${error.message}`));
  }
 }
 
  userQueue.process(async (job, done) => {
  const { userId } = job.data;

  if (!userId) return done(new Error('Missing userId'));

  const usersCollection = dbClient.db.collection('users');
  const user = await usersCollection.findOne({ _id: userId });

  if (!user) return done(new Error('User not found'));

  console.log(`Welcome ${user.email}!`);
  done();
  }
});

