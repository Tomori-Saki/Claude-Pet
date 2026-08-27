const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('Building portable executable...');

// Create dist directory
const distDir = path.join(__dirname, 'dist');
if (!fs.existsSync(distDir)) fs.mkdirSync(distDir);

// Build with electron-builder but skip signing
process.env.CSC_IDENTITY_AUTO_DISCOVERY = 'false';
process.env.WIN_CSC_LINK = '';
process.env.WIN_CSC_KEY_PASSWORD = '';

try {
  // Run electron-builder without asar
  execSync('npx electron-builder --win --publish=never --config.asar=false', {
    stdio: 'inherit',
    cwd: __dirname
  });
  console.log('Build completed!');
} catch (error) {
  console.error('Build failed:', error.message);
  
  // Fallback: Just copy the unpacked version
  console.log('\nFallback: Creating portable from unpacked files...');
  const unpackedDir = path.join(distDir, 'win-unpacked');
  const portableDir = path.join(distDir, 'Claude Pet');
  
  if (fs.existsSync(unpackedDir)) {
    if (fs.existsSync(portableDir)) fs.rmSync(portableDir, { recursive: true });
    fs.cpSync(unpackedDir, portableDir, { recursive: true });
    console.log('Portable app created at:', portableDir);
    
    // Create a launcher batch file
    const launcherPath = path.join(distDir, 'Claude Pet.bat');
    fs.writeFileSync(launcherPath, `@echo off\nstart "" "%~dp0Claude Pet\Claude Pet.exe"`);
    console.log('Launcher created at:', launcherPath);
  }
}
