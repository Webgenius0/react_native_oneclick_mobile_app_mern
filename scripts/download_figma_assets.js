const fs = require('fs');
const path = require('path');
const https = require('https');

const FIGMA_TOKEN = 'figd_abkkN9LDDY1oUkwBpY9gpOCC5ZUcTC0KbVzubbFR';
const FILE_KEY = 'H83AYBICSaB2hFFY5luWDg';
const OUTPUT_DIR = path.join(__dirname, '../src/assets/img/onboarding');

const ASSET_MAP = {
  '37907:1382': 'splash_logo.png',
  '37907:1389': 'splash_bg_bags.png',
  '37907:1439': 'header_logo.png',
  '37740:4145': 'onboarding_1_stores.png',
  '37725:3914': 'onboarding_2_cart.png',
  '37733:4053': 'onboarding_3_delivery.png',
  '37742:4148': 'auth_welcome.png',
  '37793:137': 'continue_guest.png',
  '37796:592': 'verify_phone.png',
  '37797:656': 'verify_email.png',
  '37760:4595': 'account_success.png',
  '37814:383': 'password_updated.png',
};

async function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    https.get(url, response => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: HTTP ${response.statusCode}`));
      }
      const fileStream = fs.createWriteStream(destPath);
      response.pipe(fileStream);
      fileStream.on('finish', () => {
        fileStream.close();
        resolve();
      });
    }).on('error', reject);
  });
}

async function main() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const nodeIds = Object.keys(ASSET_MAP).join(',');
  const apiUrl = `https://api.figma.com/v1/images/${FILE_KEY}?ids=${nodeIds}&format=png&scale=3`;

  console.log('Requesting image URLs from Figma...');
  const res = await fetch(apiUrl, {
    headers: { 'X-Figma-Token': FIGMA_TOKEN },
  });

  const data = await res.json();
  if (data.err) {
    throw new Error('Figma error: ' + data.err);
  }

  for (const [nodeId, fileName] of Object.entries(ASSET_MAP)) {
    const imageUrl = data.images[nodeId];
    if (!imageUrl) {
      console.warn(`No image URL for ${nodeId} (${fileName})`);
      continue;
    }
    const dest = path.join(OUTPUT_DIR, fileName);
    console.log(`Downloading ${fileName}...`);
    await downloadFile(imageUrl, dest);
    const size = fs.statSync(dest).size;
    console.log(`Saved ${fileName} (${(size / 1024).toFixed(1)} KB)`);
  }

  console.log('All Figma assets downloaded successfully!');
}

main().catch(console.error);
