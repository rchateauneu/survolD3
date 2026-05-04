const { spawn } = require('child_process');

let wmicpp;
try {
  // Try loading from build or the installed location in root
  wmicpp = require('../wmicpp/build/Release/wmicpp.node');
} catch (e) {
  try {
    wmicpp = require('../wmicpp.node');
  } catch (err) {
    wmicpp = null;
  }
}

/**
 * C++ Bridge function for GetAssociators
 */
function GetAssociatorsCPP(wmiNamespace, wmiClassName, keyProperties) { // This function receives (namespace, class, keys)
  if (wmicpp && typeof wmicpp.GetAssociators === 'function') {
    // For now, C++ implementation returns an empty array placeholder
    const result = wmicpp.GetAssociators(wmiNamespace, wmiClassName, keyProperties);
    if (result && Array.isArray(result) && result.length > 0) {
      return result;
    }
  }
  return null;
}

/**
 * Retrieves all associators for a specific WMI entity.
 * 
 * @param {string} wmiNamespace - The WMI namespace (e.g., 'root/cimv2').
 * @param {string} wmiClassName - The name of the source WMI class (e.g., 'Win32_Process').
 * @param {Object} keyProperties - Object containing key property names and values to identify the source.
 * @returns {Promise<Array>} - A promise resolving to an array of associated WMI objects.
 */
function GetAssociators(wmiNamespace, wmiClassName, keyProperties) {
  console.log(`GetAssociators called with namespace: ${wmiNamespace}, class: ${wmiClassName}, keys: ${JSON.stringify(keyProperties)}`);
  return new Promise((resolve, reject) => {
    // Attempt C++ implementation first
    const cppResult = GetAssociatorsCPP(wmiNamespace, wmiClassName, keyProperties);
    if (cppResult) {
      console.log('GetAssociators: Using C++ implementation');
      return resolve(cppResult);
    } else {
      console.log('GetAssociators: Using PowerShell implementation');
    }

    // Build the WMI object path part (e.g., Win32_Process.Handle="1234")
    const keyPart = Object.entries(keyProperties)
      .sort((a, b) => a[0].localeCompare(b[0])) // Ensure consistent key order
      .map(([key, value]) => {
        // String-based keys must be quoted in WMI object paths.
        const formattedValue = (typeof value === 'string' || typeof value === 'number') ? `'${value}'` : value;
        return `${key}=${formattedValue}`;
      })
      .join(',');

    const objectPath = `${wmiClassName}.${keyPart}`;
    console.log(`[DEBUG] Constructed WMI object path: ${objectPath}`);

    // WQL Query: Querying REFERENCES OF allowed us to see the association class itself.
    // We iterate through these associations to find the "other side" (the associator).
    const script = `
      $OutputEncoding = [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
      $sourcePath = "${objectPath}"
      $refs = Get-CimInstance -Namespace "${wmiNamespace}" -Query "ASSOCIATORS OF {$sourcePath}"
      if ($refs) {
        @($refs) | ForEach-Object {
            $assocInstance = $_
            $assocClass = $assocInstance.CimClass.CimClassName
            
            # Find all reference properties in the association and identify the target (the one that isn't the source)
            $assocInstance.CimClass.CimClassProperties | 
                Where-Object { $_.CimType -eq 'Reference' } | 
                ForEach-Object {
                    $target = $assocInstance.$($_.Name)
                    if ($target) {
                        $tCls = $target.CimClass.CimClassName
                        $tKeys = $target.CimClass.CimClassProperties | 
                            Where-Object { $_.Qualifiers.Name -contains 'Key' } | 
                            Sort-Object Name |
                            ForEach-Object {
                                $pn = $_.Name; $pv = $target.$pn
                                $fv = if ($_.CimType -eq 'String' -or $_.CimType -eq 'DateTime') { "'$pv'" } else { $pv }
                                "$pn=$fv"
                            }
                        $tPath = "$tCls.$($tKeys -join ',')"
                        
                        # Return the result if the target is not the source object itself
                        if ($tPath.ToLower() -ne $sourcePath.ToLower()) {
                            [PSCustomObject]@{
                                AssocClass = $assocClass
                                Name       = $target.Name
                                Moniker    = $tPath
                            }
                        }
                    }
                }
        } | ConvertTo-Json -Compress
      }
    `;

    const child = spawn('powershell.exe', ['-NoProfile', '-Command', script]);

    let output = '';
    let errorOutput = '';

    child.stdout.on('data', (data) => output += data.toString());
    child.stderr.on('data', (data) => errorOutput += data.toString());

    child.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`WMI Associators Query failed with exit code ${code}: ${errorOutput}`));
      }
      try {
        output = output.trim();
        if (output.charCodeAt(0) === 0xFEFF) output = output.slice(1); // Remove BOM if present
        resolve(output ? JSON.parse(output) : []);
      } catch (e) {
        reject(new Error(`Failed to parse WMI response: ${e.message}`));
      }
    });
  });
}

module.exports = { GetAssociators };