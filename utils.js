const $rdf = require('rdflib');

const LDT = $rdf.Namespace("http://www.primhillcomputers.com/survol#");
const RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
const RDFS = $rdf.Namespace("http://www.w3.org/2000/01/rdf-schema#");
const DCTERMS = $rdf.Namespace("http://purl.org/dc/terms/");

function createUriFromMoniker(windowOrigin, moniker) {
  console.log(`createUriFromMoniker moniker: ${moniker}`);
  // This URL intends to match the original version of Survol but can be replaced.
  // const objectUri = `${windowOrigin}/Survol/survol/entity.py?xid=${moniker}`;
  const objectUri = `${windowOrigin}/Survol/survol/entity.py?xid=` + encodeURIComponent(moniker);
  console.log(`createUriFromMoniker objectUri: ${objectUri}`);
  return objectUri;
}

function createUriFromClassKVpairs(windowOrigin, className, objKeyValues) {
  console.log(`createUriFromClassKVpairs objKeyValues: ${objKeyValues}`);
  const keyValuePairs = Object.entries(objKeyValues).map(
    ([key, value]) => key + "=" + value
  );

  const moniker = `${className}.${keyValuePairs.join(',')}`;
  console.log(`createUriFromClassKVpairs moniker: ${moniker}`);

  const objectUri = createUriFromMoniker(windowOrigin, moniker);
  console.log(`createUriFromClassKVpairs objectUri: ${objectUri}`);
  return objectUri;
}

function splitMoniker(monikerString) {
  console.log(`splitMoniker: ${monikerString}`);
  if (monikerString == undefined) {
    return [undefined, {}];
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
