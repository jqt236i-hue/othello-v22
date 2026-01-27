/**
 * @file check_no_math_random.js
 * @description CI check to ensure Math.random() is not used in rule layer code.
 * 
 * Usage: node scripts/check_no_math_random.js
 * Exit code 0 = pass, 1 = fail
 * 
 * Note: cpu-decision.js is excluded as CPU decision-making is separate from
 * the deterministic rule engine.
 */

const fs = require('fs');
const path = require('path');

const GAME_DIR = path.join(__dirname, '..', 'game');

// Additional files outside game/ that must also be checked
const ADDITIONAL_FILES = [
    path.join(__dirname, '..', 'card-system.js'), // Browser card state manager
];

// Excluded files with documented reasons
const EXCLUDED_FILES = [
    // cpu-decision.js: CPU AI logic is intentionally non-deterministic.
    // Online play sends only the action result, not the decision process.
    // CPU decisions do not need to be reproduced on the other client.
    'cpu-decision.js',

    // action_manager.js: actionId generation uses Math.random() for uniqueness.
    // actionId is only an identifier - it does not affect game state.
    // The actual action data (type, row, col, etc.) is deterministic.
    'action_manager.js',
];

function findJsFiles(dir, files = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            findJsFiles(fullPath, files);
        } else if (entry.name.endsWith('.js')) {
            files.push(fullPath);
        }
    }
    return files;
}

function isExcluded(filePath) {
    const basename = path.basename(filePath);
    return EXCLUDED_FILES.includes(basename);
}

function checkFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    const violations = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Check for Math.random() usage, but ignore comments
        if (line.includes('Math.random')) {
            // Skip if it's in a comment
            const trimmed = line.trim();
            if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
            // Skip if it's in a throw/error message
            if (line.includes('throw') && line.includes('PRNG')) continue;

            violations.push({
                line: i + 1,
                content: line.trim()
            });
        }
    }

    return violations;
}

function main() {
    console.log('[check_no_math_random] Scanning game/ directory...');

    const files = findJsFiles(GAME_DIR);
    let hasViolations = false;

    for (const file of files) {
        if (isExcluded(file)) {
            console.log(`  [SKIP] ${path.relative(GAME_DIR, file)} (excluded)`);
            continue;
        }

        const violations = checkFile(file);
        if (violations.length > 0) {
            hasViolations = true;
            console.log(`  [FAIL] ${path.relative(GAME_DIR, file)}`);
            for (const v of violations) {
                console.log(`    Line ${v.line}: ${v.content}`);
            }
        } else {
            console.log(`  [OK] ${path.relative(GAME_DIR, file)}`);
        }
    }

    // Also check ADDITIONAL_FILES (outside game/)
    console.log('[check_no_math_random] Checking additional files...');
    for (const file of ADDITIONAL_FILES) {
        if (!fs.existsSync(file)) {
            console.log(`  [SKIP] ${path.basename(file)} (file not found)`);
            continue;
        }

        const violations = checkFile(file);
        if (violations.length > 0) {
            hasViolations = true;
            console.log(`  [FAIL] ${path.basename(file)}`);
            for (const v of violations) {
                console.log(`    Line ${v.line}: ${v.content}`);
            }
        } else {
            console.log(`  [OK] ${path.basename(file)}`);
        }
    }

    if (hasViolations) {
        console.log('\n[check_no_math_random] FAILED: Math.random() found in rule layer code.');
        console.log('Use injected PRNG for reproducibility in online/replay mode.');
        process.exit(1);
    } else {
        console.log('\n[check_no_math_random] PASSED: No Math.random() in rule layer code.');
        process.exit(0);
    }
}

main();
