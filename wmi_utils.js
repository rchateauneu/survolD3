const { splitMoniker, createUriFromClassKVpairs, LDT, RDF } = require('./utils');
const { GetAssociators } = require('./wmi/WMI_Associators');
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


async function wmiRdfObjectInformation(windowOrigin, wmiClassName, keyProperties) {
    const store = $rdf.graph();

    const objectUri = createUriFromClassKVpairs(windowOrigin, wmiClassName, keyProperties);
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
            console.log(`Adding property to RDF store: ${propName} = ${propValue} (CimType: ${CimTypeMap_MI[propType].name})`);
            store.add(objectNode, LDT(propName), $rdf.literal(propValue, null, propType));
        }
    }

    return store;
}

async function wmiRdfAssociators(windowOrigin, wmiClassName, keyProperties) {
    const store = $rdf.graph();

    const objectUri = createUriFromClassKVpairs(windowOrigin, wmiClassName, keyProperties);
    const objectNode = $rdf.namedNode(objectUri);
    store.add(objectNode, RDF('type'), LDT(wmiClassName));

    const jsonObjectEndPoint = await GetAssociators(wmiClassName, wmiNamespace, keyProperties)

    jsonObjectEndPoint.forEach(function(objectAssociator) {
        console.log(objectAssociator);
        /*
        {
            AssocClass: 'Win32_SystemProcesses',
            Moniker: "Win32_ComputerSystem.Name='LAPTOP-R89KG6V1'"
        },
        */

        const [associatorClassName, associatorKeyValuePairs] = splitMoniker(objectAssociator.Moniker);
        // Maybe we could simply concatenate the moniker, but the class is needed anyway.
        // Beware of the error message:
        // Error: NamedNode IRI "http://localhost/xxx/entity.py?xid=CIM_DataFile.Name='C:\Program Files\chrome.exe'" ...
        // ... must not contain unencoded spaces.
        const associatorUri = createUriFromClassKVpairs(windowOrigin, associatorClassName, associatorKeyValuePairs);
        const associatorNode = $rdf.namedNode(associatorUri);
        store.add(objectNode, RDF('type'), LDT(wmiClassName));

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
    [className, kvPairs] = splitMoniker(xid);

    const rdfWmiClassMenuEndPoints = new Map();

    rdfWmiClassMenuEndPoints.set(
        "information", {
            endPointComment : "Object information",
            endPointMethod: async (windowOrigin) => {
                return await wmiRdfObjectInformation(windowOrigin, className, kvPairs);
        }});

    rdfWmiClassMenuEndPoints.set(
        "associators", {
            endPointComment : "Associated objects",    
            endPointMethod: async (windowOrigin) => {
                const objectUri = createUriFromClassKVpairs(windowOrigin, className, kvPairs);
                return await wmiRdfAssociators(windowOrigin, className, kvPairs);
        }});

    console.log("Generated menu endpoints:", rdfWmiClassMenuEndPoints);
    return rdfWmiClassMenuEndPoints;
}

module.exports = {
  wmiClassMenu
};