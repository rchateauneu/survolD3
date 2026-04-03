const $rdf = require('rdflib');

const LDT = $rdf.Namespace("http://www.primhillcomputers.com/survol#");
const RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
const RDFS = $rdf.Namespace("http://www.w3.org/2000/01/rdf-schema#");
const DCTERMS = $rdf.Namespace("http://purl.org/dc/terms/");

function createUriFromClassKVpairs(windowOrigin, className, objKeyValues) {
  const keyValuePairs = Object.entries(objKeyValues).map(
    ([key, value]) => key + "=" + encodeURIComponent(value)
  );

  const moniker = `${windowOrigin}/Survol/survol/entity.py?xid=${className}.${keyValuePairs.join(',')}`;
  return moniker;
}

function splitMoniker(monikerString) {
  console.log(`Splitting moniker: ${monikerString}`);
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
  // TODO: Handle cases where values might contain '=' or ',' characters. This is a simple split that assumes they do not.
  // TODO: The value might be a string that should be quoted. For example: Name='John Doe'. In that case, we should handle the quotes properly.
  kvPart.split(',').forEach(pair => {
    const [key, value] = pair.split('=');
    if (key) kvPairs[key] = value || '';
  });
  return [className, kvPairs];
}

module.exports = {
  createUriFromClassKVpairs,
  splitMoniker,
  LDT,
  RDF,
  RDFS,
  DCTERMS
};
