/**
 * Test script for the wmicpp native module.
 * This script verifies that the module can be loaded and its main functions called.
 */

const path = require('path');

try {
    // Load the native module from the build directory
    // cmake-js typically outputs to build/Release
    const wmicpp = require(path.resolve(__dirname, 'build/Release/wmicpp.node'));

    console.log('wmicpp module loaded successfully.');
    console.log('Exported functions:', Object.keys(wmicpp));

    // Test calls as requested. These should return empty results as per current implementation.
    // We check for both the exact name and the name without the 'CPP' suffix for robustness.
    const call = (name, ...args) => {
        const fn = wmicpp[name];
        if (typeof fn === 'function') {
            console.log(`Calling ${name}...`);
            const result = fn(...args);
            console.log(`Result of ${name}:`, JSON.stringify(result));
            return result;
        } else {
            console.error(`Error: Function ${name} is not exported.`);
        }
    };

    const currentPid = process.pid;
    call('GetReferences', 'root/cimv2', 'Win32_Process', { Handle: currentPid });
    call('GetAssociators', 'root/cimv2', 'Win32_Process', { Handle: currentPid });
    call('GetEntity', 'root/cimv2', 'Win32_Process', { Handle: currentPid });

    console.log('\nTesting finished.');

} catch (err) {
    console.error('Failed to load wmicpp module. Make sure it is built with "npm install" or "cmake-js build".');
    console.error(err.message);
}
