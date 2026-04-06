const { GetReferences } = require('./WMI_References');

/**
 * WMI_ReferencesTest.js
 * 
 * Standalone test script to verify that GetReferences can correctly retrieve 
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

  console.log(`[TEST] Attempting to retrieve references for: ${wmiClassName} (PID: ${currentPid})`);

  try {
    const references = await GetReferences(wmiClassName, wmiNamespace, keyProperties);
    console.log(references);

    if (references && references.length > 0) {
      console.log(`[SUCCESS] Found ${references.length} referenced entities.`);
      console.log(JSON.stringify(references, null, 2));
      
      //references.forEach((assoc, index) => {
      //  console.log(`  ${index + 1}. AssocClass: ${assoc.AssocClass}`);
      //  console.log(`     Moniker:    ${assoc.Moniker}`);
      //});
    } else {
      console.log('[INFO] No referenced WMI entities found for the specified PID.');
    }
  } catch (error) {
    console.error('[ERROR] WMI Associators test failed:', error.message);
  }
}

runTest();