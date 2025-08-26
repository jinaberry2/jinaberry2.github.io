const fs = require('fs');
const path = require('path');

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const updatedSeries = JSON.parse(event.body);

  try {
    const seriesPath = path.join(__dirname, 'series.json');
    const seriesData = JSON.parse(fs.readFileSync(seriesPath, 'utf8'));

    const seriesIndex = seriesData.findIndex(s => s.id === updatedSeries.id);

    if (seriesIndex === -1) {
      return { statusCode: 404, body: JSON.stringify({ message: 'Series not found.' }) };
    }

    // 포스트 ID 배열 업데이트
    seriesData[seriesIndex].postIds = updatedSeries.postIds;
    
    fs.writeFileSync(seriesPath, JSON.stringify(seriesData, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Series updated successfully.' }),
    };
  } catch (error) {
    console.error('Failed to update series:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Failed to update series.' }),
    };
  }
};
