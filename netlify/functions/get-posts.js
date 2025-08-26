const fs = require('fs');
const path = require('path');

exports.handler = async () => {
    try {
        const postsPath = path.join(__dirname, 'posts.json');
        const postsData = fs.readFileSync(postsPath, 'utf8');
        return {
            statusCode: 200,
            body: postsData,
        };
    } catch (error) {
        console.error('Failed to read posts data:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to retrieve posts.' }),
        };
    }
};
