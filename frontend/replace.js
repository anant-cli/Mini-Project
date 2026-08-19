import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      if (f !== 'node_modules' && f !== '.git') {
        walkDir(dirPath, callback);
      }
    } else {
      callback(path.join(dir, f));
    }
  });
}

walkDir('.', function(filePath) {
  if (filePath.endsWith('.html') || filePath.endsWith('.js') && !filePath.includes('replace.js') && !filePath.includes('vite.config.js')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;
    content = content.replace(/clay-card/g, 'glass-card');
    content = content.replace(/clay-input/g, 'glass-input');
    content = content.replace(/clay-btn/g, 'btn');
    if (content !== original) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log('Updated ' + filePath);
    }
  }
});
