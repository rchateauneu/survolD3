const $rdf = require('rdflib');
const { RDFS, DCTERMS } = require('./utils');

/**
 * Internal helper to map a menu item to RDF statements.
 */
function menuToRdf(menuStore, uriRootEndPoint, key, value) {
  const nodeRootEndPoint = $rdf.namedNode(uriRootEndPoint);
  const nodeSubEndPoint = $rdf.namedNode(uriRootEndPoint + "/__NODE__." + key);

  menuStore.add(nodeRootEndPoint, DCTERMS('hasPart'), $rdf.namedNode(nodeSubEndPoint));
  menuStore.add(nodeSubEndPoint, RDFS('label'), $rdf.literal(value.endPointComment));
  
  const uriRdf = uriRootEndPoint + "/" + key;
  const nodeRdf = $rdf.namedNode(uriRdf);
  menuStore.add(nodeSubEndPoint, RDFS('seeAlso'), $rdf.namedNode(nodeRdf));
}

/**
 * Recursively traverses the endpoint map to build the RDF menu structure.
 */
function recursiveMenuGeneration(store, menuLabel, uriRootEndPoint, theEndPoints) {
  store.add($rdf.namedNode(uriRootEndPoint), RDFS('label'), $rdf.literal(menuLabel));

  theEndPoints.forEach((value, key) => {
    if (value.endPointComment !== undefined) {
      menuToRdf(store, uriRootEndPoint, key, value);
    } else {
      const uriSubEndPoint = uriRootEndPoint + "/" + key;
      recursiveMenuGeneration(store, key, uriSubEndPoint, value);
    }
  });
}

/**
 * Generates an RDF graph representing the menu for a given class.
 */
function generateMenu(className, theRdfEndpoints, windowOrigin) {
  const menuStore = $rdf.graph();
  console.log("Generating menu for class:", className, "windowOrigin:", windowOrigin);
  const rootUri = windowOrigin + "/objects";

  recursiveMenuGeneration(menuStore, className, rootUri, theRdfEndpoints);

  return menuStore;
}

module.exports = {
  generateMenu
};