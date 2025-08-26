const fs = require('fs');
const path = require('path');

exports.handler = async () => {
  try {
    const seriesPath = path.join(__dirname, 'series.json');
    const seriesData = fs.readFileSync(seriesPath, 'utf8');
    
    return {
      statusCode: 200,
      body: seriesData,
    };
  } catch (error) {
    console.error('Failed to read series data:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to retrieve series data.' }),
    };
  }
};
