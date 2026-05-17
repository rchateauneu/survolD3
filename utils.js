const $rdf = require('rdflib');

const LDT = $rdf.Namespace("http://www.primhillcomputers.com/survol#");
const RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
const RDFS = $rdf.Namespace("http://www.w3.org/2000/01/rdf-schema#");
const DCTERMS = $rdf.Namespace("http://purl.org/dc/terms/");

/*
The moniker is not encoded.
*/
function createUriFromMoniker(windowOrigin, moniker) {
  if (moniker && moniker.includes('%')) {
    const errorMessage = `Error: moniker "${moniker}" contains forbidden character "%"`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  console.log(`createUriFromMoniker moniker: ${moniker}`);

  [className, kvPairs] = splitMoniker(moniker);

  // This URL intends to match the original version of Survol but can be replaced.
  const objectUri = createUriFromClassKVpairs(windowOrigin, className, kvPairs);
  // const objectUri = `${windowOrigin}/Survol/survol/entity.py?xid=` + encodeURIComponent(moniker);
  console.log(`createUriFromMoniker objectUri: ${objectUri}`);
  return objectUri;
}

/*
The key-value pairs are not encoded.
*/
function createUriFromClassKVpairs(windowOrigin, className, objKeyValues) {
  console.log(`createUriFromClassKVpairs objKeyValues: ${objKeyValues}`);
  const keyValuePairs = Object.entries(objKeyValues).map(
    ([key, value]) => {
      if (typeof value === 'string' && value.includes('%')) {
        const errorMessage = `Error: value "${value}" contains forbidden character "%"`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }
      return key + "=" + encodeURIComponent(value);
    }
  );

  const encoded_moniker = `${className}.${keyValuePairs.join(',')}`;
  console.log(`createUriFromClassKVpairs encoded_moniker: ${encoded_moniker}`);
  const objectUri = `${windowOrigin}/Survol/survol/entity.py?xid=${encoded_moniker}`;

  console.log(`createUriFromClassKVpairs objectUri: ${objectUri}`);
  return objectUri;
}

/*
The moniker is not encoded.
*/
function splitMoniker(monikerString) {
  console.log(`splitMoniker: ${monikerString}`);

  if (monikerString == undefined) {
    return [undefined, {}];
  }

  if (monikerString.includes('%')) {
    const errorMessage = `splitMoniker Error: monikerString "${monikerString}" contains forbidden character "%"`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  const dotIndex = monikerString.indexOf('.');
  if (dotIndex === -1) {
    return [monikerString, {}];
  }
  const className = monikerString.substring(0, dotIndex);
  const kvPart = monikerString.substring(dotIndex + 1);
  const kvPairs = {};

  // Split the key-value part by commas, but only if the comma is not inside quotes.
  // The regex matches sequences of: double-quoted text, single-quoted text, or any character that is not a comma.
  const segments = kvPart.match(/(?:"[^"]*"|'[^']*'|[^,])+/g) || [];

  segments.forEach(pair => {
    let [key, value] = pair.split('=');

    if(value)   {
      if (value.includes('%')) {
        const errorMessage = `splitMoniker Error: value "${value}" contains forbidden character "%"`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      }
      if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      }
    }
    if (key) kvPairs[key] = value || '';
  });
  console.log(`splitMoniker className: ${className}`);
  console.log(`splitMoniker kvPairs: ${JSON.stringify(kvPairs)}`);
  return [className, kvPairs];
}

module.exports = {
  createUriFromMoniker,
  createUriFromClassKVpairs,
  splitMoniker,
  LDT,
  RDF,
  RDFS,
  DCTERMS
};
