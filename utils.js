const $rdf = require('rdflib');

const LDT = $rdf.Namespace("http://www.primhillcomputers.com/survol#");
const RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
const RDFS = $rdf.Namespace("http://www.w3.org/2000/01/rdf-schema#");
const DCTERMS = $rdf.Namespace("http://purl.org/dc/terms/");

function createMoniker(windowOrigin, className, objKeyValues) {
  const keyValuePairs = Object.entries(objKeyValues).map(([key, value]) => `${key}=${value}`);
  const moniker = `${windowOrigin}/Survol/survol/entity.py?xid=${className}.${keyValuePairs.join(',')}`;
  return moniker;
}

module.exports = {
  createMoniker,
  LDT,
  RDF,
  RDFS,
  DCTERMS
};
