const fs = require('fs');
const path = require('path');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { name } = JSON.parse(event.body);

  if (!name) {
    return { statusCode: 400, body: JSON.stringify({ message: 'Series name is required.' }) };
  }

  try {
    const seriesPath = path.join(__dirname, 'series.json');
    const seriesData = JSON.parse(fs.readFileSync(seriesPath, 'utf8'));

    const newSeries = {
      id: Date.now(),
      name: name,
      postIds: [],
      firstPostTimestamp: Date.now()
    };

    seriesData.push(newSeries);
    fs.writeFileSync(seriesPath, JSON.stringify(seriesData, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify(newSeries),
    };
  } catch (error) {
    console.error('Failed to create series:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to create series.' }),
    };
  }
};
