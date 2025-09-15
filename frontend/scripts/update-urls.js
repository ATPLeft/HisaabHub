const fs = require('fs');
const path = require('path');

// Read your Vercel domain from command line or environment
const vercelDomain = process.argv[2] || process.env.VERCEL_DOMAIN;

if (!vercelDomain) {
  console.error('Please provide your Vercel domain: npm run update:urls -- your-domain.vercel.app');
  process.exit(1);
}

// Update server.js
const serverPath = path.join(__dirname, '../backend/server.js');
let serverContent = fs.readFileSync(serverPath, 'utf8');

serverContent = serverContent.replace(
  /const allowedOrigins = \[[^\]]+\]/,
  `const allowedOrigins = [\n      'https://${vercelDomain}',\n      'http://localhost:5173'\n    ]`
);

fs.writeFileSync(serverPath, serverContent);
console.log('Updated server.js with new domain:', vercelDomain);