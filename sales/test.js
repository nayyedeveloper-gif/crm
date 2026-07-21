import https from 'https';

function get(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        resolve(get(res.headers.location));
      } else {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => resolve(data));
      }
    }).on('error', reject);
  });
}

get('https://docs.google.com/spreadsheets/d/1BTsMIOzMZ83XuAy3C7MYbK-j-JJYbkU_Nr0Oe_-7_uI/export?format=csv&gid=0').then(data => {
  const lines = data.split('\n');
  const reasons = new Set();
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(',');
    if (cols.length > 4) {
      reasons.add(cols[4]);
    }
  }
  console.log('Reasons:', Array.from(reasons));
});
