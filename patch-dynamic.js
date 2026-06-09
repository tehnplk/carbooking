const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      // only patch route.ts
      if (file.endsWith('route.ts') || file.endsWith('page.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./app');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (!content.includes('export const dynamic') && !content.includes("'use client'") && !content.includes('"use client"')) {
    content = "export const dynamic = 'force-dynamic';\n" + content;
    fs.writeFileSync(file, content);
    console.log('Patched: ', file);
  }
});
