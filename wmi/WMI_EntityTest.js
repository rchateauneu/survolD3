const { GetEntity } = require('./WMI_Entity');

/**
 * WMI_EntityTest.js
 * 
 * Standalone test script to verify that GetEntity can correctly retrieve 
 * properties from WMI for a specific running process.
 */
async function runTest() {
  // Get the PID of the currently running Node.js process.
  const currentPid = process.pid;
  
  // WMI parameters for the current process.
  const wmiClassName = 'Win32_Process';
  const wmiNamespace = 'root/cimv2';
  
  // For Win32_Process, the key property for the process ID is 'Handle'.
  const keyProperties = { Handle: currentPid };

  console.log(`[TEST] Attempting to retrieve WMI entity: ${wmiClassName}`);
  console.log(`[TEST] Filter: Handle = ${currentPid}`);

  try {
    const entityData = await GetEntity(wmiClassName, wmiNamespace, keyProperties);

    if (entityData) {
      console.log('[SUCCESS] Data retrieved for current process:');
      console.log(JSON.stringify(entityData, null, 2));
    } else {
      console.log('[FAILURE] No WMI entity found for the specified PID.');
    }
  } catch (error) {
    console.error('[ERROR] WMI test failed:', error.message);
  }
}

runTest();