const { spawn } = require('child_process');

/**
 * Retrieves a specific WMI entity with all its properties and values.
 * 
 * @param {string} wmiClassName - The name of the WMI class (e.g., 'Win32_Process').
 * @param {string} wmiNamespace - The WMI namespace (e.g., 'root/cimv2').
 * @param {Object} keyProperties - Object containing key property names and values used to filter.
 * @returns {Promise<Object|null>} - A promise resolving to the WMI object properties.
 */
function GetEntity(wmiClassName, wmiNamespace, keyProperties) {
  console.log(`GetEntity called with class: ${wmiClassName}, namespace: ${wmiNamespace}, keys: ${JSON.stringify(keyProperties)}`);
  return new Promise((resolve, reject) => {
    // Build a WQL filter from the key properties (e.g., "Handle=1234" or "Name='C:'")
    const filter = Object.entries(keyProperties)
      .map(([key, value]) => {
        const formattedValue = typeof value === 'string' ? `'${value}'` : value;
        return `${key}=${formattedValue}`;
      })
      .join(' AND ');

    // Get-CimInstance retrieves the object; ConvertTo-Json handles the serialization.
    const script = `
      $OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
      $obj = Get-CimInstance -Namespace "${wmiNamespace}" -ClassName "${wmiClassName}" -Filter "${filter}"
      if ($obj) {
        $obj | Select-Object -Property * | ConvertTo-Json -Compress
      }
    `;
    console.log(script);

    const child = spawn('powershell.exe', ['-NoProfile', '-Command', script]);

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => output += data.toString());
    child.stderr.on('data', (data) => errorOutput += data.toString());

    child.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`WMI Query failed with exit code ${code}: ${errorOutput}`));
      }
      try {
        output = output.trim();
        if (output.charCodeAt(0) === 0xFEFF) output = output.slice(1); // Remove BOM if present
        resolve(output ? JSON.parse(output) : null);
      } catch (e) {
        reject(new Error(`Failed to parse WMI response: ${e.message}`));
      }
    });
  });
}

module.exports = { GetEntity };