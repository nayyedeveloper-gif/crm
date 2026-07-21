import dotenv from 'dotenv';

dotenv.config();

const checkUrl = async (name: string, url?: string) => {
  if (!url) {
    console.log(`❌ ${name}: Not configured`);
    return;
  }

  console.log(`\n🔍 Checking ${name}...`);
  console.log(`   URL: ${url}`);

  try {
    const fetchUrl = `${url}${url.includes('?') ? '&' : '?'}cachebust=${Date.now()}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    const response = await fetch(fetchUrl, { redirect: 'follow', signal: controller.signal });
    clearTimeout(timeout);

    console.log(`   Status: ${response.status} ${response.statusText}`);
    console.log(`   Content-Type: ${response.headers.get('content-type') || 'unknown'}`);
    console.log(`   Redirected: ${response.redirected}`);

    const text = await response.text();
    const preview = text.slice(0, 200).replace(/\s+/g, ' ');

    if (response.ok && text.length > 0 && !text.trim().startsWith('<!DOCTYPE')) {
      const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
      console.log(`   ✅ Looks valid — ${lines.length} lines`);
      console.log(`   Preview: ${preview}...`);
    } else if (text.trim().startsWith('<!DOCTYPE')) {
      console.log(`   ❌ Returned HTML (not CSV)`);
      console.log(`   Preview: ${preview}...`);
    } else {
      console.log(`   ❌ Bad response`);
      console.log(`   Preview: ${preview}...`);
    }
  } catch (err: any) {
    console.log(`   ❌ Error: ${err.message}`);
  }
};

const run = async () => {
  console.log('Google Sheets URL Diagnostics');
  console.log('=============================');
  await checkUrl('Sales Sheet', process.env.SALES_SHEET_URL);
  await checkUrl('Target Sheet', process.env.TARGET_SHEET_URL);

  console.log('\n📋 Troubleshooting tips:');
  console.log('   1. Make sure the sheet is "Published to the web" (File → Share → Publish to web)');
  console.log('   2. The URL must end with /export?format=csv&gid={sheetId}');
  console.log('   3. If the sheet is private, use a service account or OAuth to access it');
  console.log('   4. Test the URL in a private/incognito browser tab first');
};

run();
