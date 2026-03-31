const { GetAssociators } = require('./WMI_Associators');

/**
 * WMI_AssociatorsTest.js
 * 
 * Standalone test script to verify that GetAssociators can correctly retrieve 
 * linked WMI entities for a specific running process.
 */
async function runTest() {
  // Get the PID of the currently running Node.js process.
  const currentPid = process.pid;
  
  // WMI parameters for the source process.
  const wmiClassName = 'Win32_Process';
  const wmiNamespace = 'root/cimv2';
  
  // For Win32_Process, the key property for the process ID is 'Handle'.
  const keyProperties = { Handle: currentPid };

  console.log(`[TEST] Attempting to retrieve associators for: ${wmiClassName} (PID: ${currentPid})`);

  try {
    const associators = await GetAssociators(wmiClassName, wmiNamespace, keyProperties);
    console.log(associators);

    if (associators && associators.length > 0) {
      console.log(`[SUCCESS] Found ${associators.length} associated entities.`);
      
      associators.forEach((assoc, index) => {
        console.log(`  ${index + 1}. AssocClass: ${assoc.AssocClass}`);
        console.log(`     Moniker:    ${assoc.Moniker}`);
      });
    } else {
      console.log('[INFO] No associated WMI entities found for the specified PID.');
    }
  } catch (error) {
    console.error('[ERROR] WMI Associators test failed:', error.message);
  }
}

runTest();