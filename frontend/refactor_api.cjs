const fs = require('fs');
const path = require('path');

const frontendSrc = path.join('e:', 'METAGRAM', 'frontend', 'src');
const baseUrl = "http://localhost:8000/api/v1";

function refactorFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Skip the api config file itself to avoid infinite recursion or breaking it
    if (filePath.includes(path.join('src', 'api', 'index.js'))) return;

    if (!content.includes(baseUrl) && !content.includes('axios')) {
        return;
    }

    console.log(`Refactoring: ${filePath}`);

    // Replace import axios
    content = content.replace(/import axios from ['"]axios['"];?/g, "import api from '@/api';");
    
    // Replace hardcoded URLs
    content = content.replace(new RegExp(baseUrl + '/', 'g'), "/");
    content = content.replace(new RegExp(baseUrl, 'g'), "/");
    
    // Replace axios method calls
    content = content.replace(/axios\.get\(/g, "api.get(");
    content = content.replace(/axios\.post\(/g, "api.post(");
    content = content.replace(/axios\.put\(/g, "api.put(");
    content = content.replace(/axios\.delete\(/g, "api.delete(");
    content = content.replace(/axios\.patch\(/g, "api.patch(");

    // Remove withCredentials: true as it's now handled by the instance
    content = content.replace(/,\s*{\s*withCredentials:\s*true\s*}/g, "");
    content = content.replace(/{\s*withCredentials:\s*true\s*}/g, "{}");
    content = content.replace(/,\s*withCredentials:\s*true/g, "");
    content = content.replace(/withCredentials:\s*true,?\s*/g, "");

    fs.writeFileSync(filePath, content, 'utf8');
}

function walk(dir) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walk(fullPath);
        } else if (file.endsWith('.js') || file.endsWith('.jsx')) {
            refactorFile(fullPath);
        }
    });
}

walk(frontendSrc);
console.log("Refactoring complete.");
