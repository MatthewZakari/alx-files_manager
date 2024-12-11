import redisClient from './utils/redis';
import dbClient from './utils/db';

(async () => {
    await redisClient.connect();
    console.log('Redis client ready');
    console.log(redisClient.isAlive());  /* This should return true after the connection is made */
    console.log(await redisClient.get('myKey'));
    await redisClient.set('myKey', 12);  /* Fixed set parameters */
    console.log(await redisClient.get('myKey'));

    setTimeout(async () => {
        console.log(await redisClient.get('myKey'));
    }, 1000 * 10);
})();
/*
const waitConnection = () => {
    return new Promise((resolve, reject) => {
        let i = 0;
        const repeatFct = async () => {
            await setTimeout(() => {
                i += 1;
                if (i >= 10) {
                    reject('Connection attempt failed');
                } else if (!dbClient.isAlive()) {
                    repeatFct();
                } else {
                    resolve();
                }
            }, 1000);
        };
        repeatFct();
    });
};

(async () => {
    console.log(dbClient.isAlive());
    await waitConnection();
    console.log(dbClient.isAlive());
    console.log(await dbClient.nbUsers());
    console.log(await dbClient.nbFiles());
})();
*/
