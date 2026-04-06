const { splitMoniker, createUriFromClassKVpairs, createUriFromMoniker, LDT, RDF, RDFS } = require('./utils');
const { GetReferences } = require('./wmi/WMI_References');
const { GetEntity } = require('./wmi/WMI_Entity');

const wmiNamespace = 'root/cimv2';

const $rdf = require('rdflib');


// PowerShell returns MI types, not CIM types, and arrays cannot be handled.
// There are other ways to get these values, for example using Get-WmiObject or raw COM ([WMI] or System.Management).
const CimTypeMap_MI = {
  0:  { name: "Unknown",    jsType: "unknown" },
  1:  { name: "Boolean",    jsType: "boolean", rdfType: "xsd:boolean" },
  2:  { name: "UInt8",      jsType: "number",  rdfType: "xsd:unsignedByte" },
  3:  { name: "SInt8",      jsType: "number",  rdfType: "xsd:byte" },
  4:  { name: "UInt16",     jsType: "number",  rdfType: "xsd:unsignedShort" },
  5:  { name: "SInt16",     jsType: "number",  rdfType: "xsd:short" },
  6:  { name: "UInt32",     jsType: "number",  rdfType: "xsd:unsignedInt" },
  7:  { name: "SInt32",     jsType: "number",  rdfType: "xsd:int" },
  8:  { name: "UInt64",     jsType: "bigint",  rdfType: "xsd:unsignedLong" },
  9:  { name: "SInt64",     jsType: "bigint",  rdfType: "xsd:long" },
  10: { name: "Real32",     jsType: "number",  rdfType: "xsd:float" },
  11: { name: "Real64",     jsType: "number",  rdfType: "xsd:double" },
  12: { name: "Char16",     jsType: "string",  rdfType: "xsd:string" },
  13: { name: "DateTime",   jsType: "string",  rdfType: "xsd:dateTime" },
  14: { name: "String",     jsType: "string",  rdfType: "xsd:string" },
  15: { name: "Reference",  jsType: "string",  rdfType: "xsd:anyURI" },
  16: { name: "Instance",   jsType: "object",  rdfType: null }
};


async function wmiRdfObjectInformation(windowOrigin, objectUri, wmiClassName, keyProperties) {
    const store = $rdf.graph();
    console.log("wmiRdfObjectInformation objectUri:", objectUri);
    console.log("wmiRdfObjectInformation wmiClassName:", wmiClassName);
    console.log("wmiRdfObjectInformation keyProperties:", keyProperties);

    console.log(`wmiRdfObjectInformation Object URI: ${objectUri}`);
    const objectNode = $rdf.namedNode(objectUri);
    store.add(objectNode, RDF('type'), LDT(wmiClassName));

    const jsonObjectEndPoint = await GetEntity(wmiClassName, wmiNamespace, keyProperties);

    const cimInstanceProperties = jsonObjectEndPoint.CimInstanceProperties;
    for (const oneProperty of cimInstanceProperties) {
        /*
            {
            "Name": "Name",
            "Value": "node.exe",
            "CimType": 14,
            "Flags": "Property, ReadOnly, NotModified",
            "IsValueModified": false
            },
        */
        const propName = oneProperty.Name;
        const propValue = oneProperty.Value;
        const propType = oneProperty.CimType;

        if(propValue != null) {
            const mappedType = CimTypeMap_MI[propType] || { name: "Unknown", rdfType: null };
            const rdfDataType = mappedType.rdfType ? $rdf.namedNode(mappedType.rdfType.replace('xsd:', 'http://www.w3.org/2001/XMLSchema#')) : null;
            
            console.log(`Adding property to RDF store: ${propName} = ${propValue} (CimType: ${mappedType.name})`);
            store.add(objectNode, LDT(propName), $rdf.literal(propValue, null, rdfDataType));
        }
    }

    return store;
}

async function wmiRdfAssociators(windowOrigin, objectUri,wmiClassName, keyProperties) {
    const store = $rdf.graph();
    console.log("wmiRdfAssociators objectUri:", objectUri);
    console.log("wmiRdfAssociators wmiClassName:", wmiClassName);
    console.log("wmiRdfAssociators keyProperties:", keyProperties);

    const objectNode = $rdf.namedNode(objectUri);
    store.add(objectNode, RDF('type'), LDT(wmiClassName));

    const jsonObjectEndPoint = await GetReferences(wmiClassName, wmiNamespace, keyProperties);
    if(!jsonObjectEndPoint == null)
    {
        return store; // No references found, return the store with just the object information.
    }
    console.log(`Associators found: ${jsonObjectEndPoint.length}`);
    if(jsonObjectEndPoint.length == null) {
        console.log(`No references found for ${wmiClassName} with key properties ${JSON.stringify(keyProperties)}`);
        return store;
    }

    jsonObjectEndPoint.forEach(function(objectAssociator) {
        console.log(objectAssociator);
        // {
        //     "AssocClass": "CIM_ProcessExecutable",
        //     "Name": "C:\\WINDOWS\\System32\\combase.dll",
        //     "Moniker": "CIM_DataFile.Name='C:\\WINDOWS\\System32\\combase.dll'"        },
        // }

        const [associatorClassName, associatorKeyValuePairs] = splitMoniker(objectAssociator.Moniker);
        // Maybe we could simply concatenate the moniker, but the class is needed anyway.
        // Beware of the error message:
        // Error: NamedNode IRI "http://localhost/xxx/entity.py?xid=CIM_DataFile.Name='C:\Program Files\chrome.exe'" ...
        // ... must not contain unencoded spaces.
        const associatorUri = createUriFromClassKVpairs(windowOrigin, associatorClassName, associatorKeyValuePairs);
        const associatorNode = $rdf.namedNode(associatorUri);
        store.add(associatorNode, RDF('type'), LDT(associatorClassName));
        console.log(`Adding associator to RDF store: ${associatorUri} ` + objectAssociator);
        const associatorLabel = objectAssociator.Name || "No Name";
        console.log(`Associator label: ${associatorLabel} objectAssociator.Name: ${objectAssociator.Name}`);
        store.add(associatorNode, RDFS('label'), $rdf.literal(associatorLabel));
        store.add(associatorNode, RDF('Name'), $rdf.literal(associatorLabel));

        // The name of the asociator class is used as the predicate.
        store.add(objectNode, LDT(objectAssociator.AssocClass), associatorNode);
    });

    return store;
}

function wmiClassMenu(windowOrigin, xid)
{
    console.log("windowOrigin:", windowOrigin);
    console.log("Generating menu for xid:", xid);
    if( xid == undefined || xid == "") {
        console.error("xid is undefined or empty. Returning null.");
        return null;
    }
    const objectUri = createUriFromMoniker(windowOrigin, xid)
    const [className, kvPairs] = splitMoniker(xid);

    // WMI wants to have escaped backslashes:
    for (const [key, value] of Object.entries(kvPairs)) {
        kvPairs[key] = value.replace(/\\/g, '\\\\');
    }

    const rdfWmiClassMenuEndPoints = new Map();

    rdfWmiClassMenuEndPoints.set(
        "information", {
            endPointComment : "Object information",
            endPointMethod: async (windowOrigin) => {
                return await wmiRdfObjectInformation(windowOrigin, objectUri, className, kvPairs);
        }});

    rdfWmiClassMenuEndPoints.set(
        "references", {
            endPointComment : "Referenced objects",    
            endPointMethod: async (windowOrigin) => {
                return await wmiRdfAssociators(windowOrigin, objectUri, className, kvPairs);
        }});

    console.log("Generated menu endpoints:", rdfWmiClassMenuEndPoints);
    return rdfWmiClassMenuEndPoints;
}

module.exports = {
  wmiClassMenu
};