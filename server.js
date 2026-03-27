const express = require('express');
const cors = require('cors');
const $rdf = require('rdflib');
const si = require('systeminformation');
const fs = require('fs');
const open = require('open');

const app = express();
app.use(cors());
app.use(express.static('.'));

const port = 8765;

const LDT = $rdf.Namespace("http://www.primhillcomputers.com/survol#");
const RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
const RDFS = $rdf.Namespace("http://www.w3.org/2000/01/rdf-schema#");

function fillProcess(store, serverHost, portNumber, userName, parentPid, processName, processId) {
  const baseUrl = `http://${serverHost}:${portNumber}/Survol/survol/entity.py`;

  const processUri = `${baseUrl}?xid=CIM_Process.Handle=${processId}`;
  const processNode = $rdf.namedNode(processUri);

  // <rdf:type rdf:resource="http://www.primhillcomputers.com/survol#CIM_Process"/>
  store.add(processNode, RDF('type'), LDT('CIM_Process'));

  // <ldt:account rdf:resource="http://<SERVER_HOST>:<PORT_NUMBER>/Survol/survol/entity.py?xid=LMI_Account.Name=<USER_NAME>,Domain=<SERVER_HOST>"/>
  const accountUri = `${baseUrl}?xid=LMI_Account.Name=${userName},Domain=${serverHost}`;
  store.add(processNode, LDT('account'), $rdf.namedNode(accountUri));

  // <ldt:Handle>24</ldt:Handle> -> Using PID.
  store.add(processNode, LDT('Handle'), $rdf.literal(String(processId)));

  // <ldt:ppid rdf:resource="http://<SERVER_HOST>:<PORT_NUMBER>/Survol/survol/entity.py?xid=CIM_Process.Handle=<PARENT_PID>"/>
  const parentProcessUri = `${baseUrl}?xid=CIM_Process.Handle=${parentPid}`;
  store.add(processNode, LDT('ppid'), $rdf.namedNode(parentProcessUri));

  // <rdfs:label><PROCESS_NAME></rdfs:label>
  store.add(processNode, RDFS('label'), $rdf.literal(processName));

  // <ldt:pid><PID></ldt:pid>
  store.add(processNode, LDT('pid'), $rdf.literal(String(processId)));
}

async function fillProcessesList(serverHost, portNumber) {
  const store = $rdf.graph();
  detectedProcesses = new Set();
  detectedParents = new Set();

  try {
    const data = await si.processes();
    data.list.forEach(p => {
      detectedProcesses.add(p.pid);
      detectedParents.add(p.parentPid);
      fillProcess(store, serverHost, portNumber, p.user, p.parentPid, p.name, p.pid);
    });
  } catch (error) {
    console.error("Error getting process list:", error);
  }
  undefinedProcs = new Set([...detectedParents].filter(x => !detectedProcesses.has(x)));
  undefinedProcs.forEach(pid => {
    console.warn(`Parent PID ${pid} not found in process list. Adding placeholder node.`);
    fillProcess(store, serverHost, portNumber, 'unknown', 'unknown', `Unknown Process ${pid}`, pid);
  });
  console.log(`Leaving with ${detectedProcesses.size} processes and ${undefinedProcs.size} undefined parent processes.`);
  return store;
}


function rdfRootNode(serverHost, portNumber) {
  return $rdf.namedNode(`http://${serverHost}:${port}/Survol/survol/entity.py?xid=CIM_ComputerSystem.Name=${serverHost}`);;
}

function minimalRdfContent(serverHost, portNumber) {
  const store = $rdf.graph();
  const subj = rdfRootNode(serverHost, portNumber);

  store.add(subj, RDFS('label'), $rdf.literal(serverHost));
  store.add(subj, LDT('Name'), $rdf.literal(serverHost));
  store.add(subj, RDF('type'), LDT('CIM_ComputerSystem'));
  return store;
}

function recursiveMenuGeneration(uriRootEndPoint, theEndPoints, menuToRdfCallback) {
  console.log(`recursiveMenuGeneration uriRootEndPoint: ${uriRootEndPoint}`);
  theEndPoints.forEach((value, key) => {
    console.log(`recursiveMenuGeneration for ${key}: ${value}`);
  });
  function callback(value, key, map) {
    console.log(`callback: ${value}, ${key}`);
    if (value.endPointComment != undefined && value.endPointComment != undefined) {
      console.log(`Final menu node: ${key}`);
      menuToRdfCallback(uriRootEndPoint, key, value);
    } else {
      // This is an intermediate node,
      console.log(`Intermediate menu node: ${key}`);
      const uriSubEndPoint = uriRootEndPoint + "/" + key;
      recursiveMenuGeneration(uriSubEndPoint, value, menuToRdfCallback);
    }
  };
  console.log(`theEndPoints: ${theEndPoints}`);
  theEndPoints.forEach(callback);
}

function generateMenu(className, theRdfEndpoints, serverHost, portNumber) {
  console.log(`generateMenu serverHost: ${serverHost}, portNumber: ${portNumber}`);
  console.log(`generateMenu theRdfEndpoints: ${theRdfEndpoints}`);
  theRdfEndpoints.forEach((value, key) => {
    console.log(`generateMenu for ${key}: ${value}`);
  });
  const store = $rdf.graph();

  function menuToRdf(uriRootEndPoint, key, value) {
    console.log(`menuToRdf: ${value}, ${key}`);
    // Intermediate nodes are never seen on the interface.
    const nodeRootEndPoint = $rdf.namedNode(uriRootEndPoint);
    // When discovering the trees of menus, if one node has no seeAlso, then it is an intermediate node.
    // Alternatively, we may choose to build the subnodes at demand, but this prevents to have a beautiful display of the menu tree.
    store.add(nodeRootEndPoint, RDFS('label'), $rdf.literal(value.endPointComment));
    // Only clickable nodes which have an associate method.
    const uriSubEndPoint = uriRootEndPoint + "/" + key;
    const nodeSubEndPoint = $rdf.namedNode(uriSubEndPoint);
    store.add(nodeRootEndPoint, RDFS('seeAlso'), $rdf.namedNode(nodeSubEndPoint));
    console.log(`menuToRdf leaving: ${value}, ${key}`);
  }

  const rootUri = `http://${serverHost}:${port}/menu/${className}`;
  // TODO: This might receive the definition of an object and will return its endpoints.
  // Depending on this, the starting point of the menu generation is not rdfEndpoints,
  // but has the same structure.

  /*
  Again : Consider having a tree of classes and subclasses.
  Or directories and subdirectories.
  The leaves of the tree are the endpoints which have an associated method.
  The intermediate nodes are just for display and navigation purposes, and do not have an associated method.

  Several possible trees:
  - Static tree defined at server startup, with all endpoints. This is the simplest to implement, but not the most flexible.
  - Static tree based on class hierarchies.
  - Static tree based on directories and subdirectories.

  Consider mixing all of them, if needed.
  Difficulty: We do not want CGI endpoints by default, so we cannot match one-to-one an endpoint with a file.
  (Which was really cunning when thinking about it).

  TODO: Understand how the server works, if it could be possible to have a dynamic tree, which is generated at demand, and not at server startup.
  */
  recursiveMenuGeneration(rootUri, theRdfEndpoints, menuToRdf);
  console.log(`generateMenu LEAVING serverHost: ${serverHost}, portNumber: ${portNumber}`);
  return store;
}

function getHostPort(req) {
  const hostHeader = req.get('host') || `localhost:${port}`;
  const [host, maybePort] = hostHeader.split(':');
  const portNumber = maybePort || port;
  const serverHost = host || 'localhost';
  return [serverHost, portNumber];
}

/* This map can be filled several ways:
- Hard-coded at server startup, with all endpoints. This is the simplest to implement, but not the most flexible.
- Dynamically, based on class hierarchies.
- Dynamically, based on directories and subdirectories.
- Dynamically, based on the presence of files in a directory, which are not necessarily CGI endpoints, but which have an associated method to generate RDF data.
*/

rdfEndpoints = new Map();

rdfEndpoints.set(
  "CIM_ComputerSystem",
  new Map(
    [
    ["top", {
      endPointComment : "Dummy endpoint to test RDF generation",
      endPointMethod: (req) => {
      [serverHost, portNumber] = getHostPort(req);
      const store = minimalRdfContent(serverHost, portNumber);
      return $rdf.serialize(null, store, `http://${serverHost}:${portNumber}/`, 'application/rdf+xml');
    }}
    ],
    ["processes_list", {
      endPointComment : "List of processes",    
      endPointMethod: async (req) => {
      [serverHost, portNumber] = getHostPort(req);
      const store = await fillProcessesList(serverHost, portNumber);
      return $rdf.serialize(null, store, `http://${serverHost}:${portNumber}/`, 'application/rdf+xml');
      }
    }]
  ]));

app.get('/rdf', (req, res) => {
  res.set('Content-Type', 'text/turtle');
  res.send(`@prefix ex: <http://example.org/> .
ex:subject ex:predicate ex:object .
ex:another ex:rel ex:thing .`);
});

app.get('/menu/:className', (req, res, next) => {
  rdfEndpoints.forEach((key, value) => {
    console.log(`rdfEndpoints element: ${key}`, value);
  });
  console.log("================================");
  console.log(`req.params.className = ${req.params.className}`);

  const classEndPoints = rdfEndpoints.get(req.params.className);
  if (!classEndPoints) return res.status(404).send(`Class not found: ${req.params.className}`);

  classEndPoints.forEach((key, value) => {
    console.log(`classEndPoint element: ${key}`, value);
  });
  console.log("================================");

  [serverHost, portNumber] = getHostPort(req);
  const store = generateMenu(req.params.className, classEndPoints, serverHost, portNumber);
  console.log("After generateMenu ================================");
  console.log(`store: ${store}  ${typeof(store)}`);
  console.log("After display ================================");
  const rdfData = $rdf.serialize(null, store, `http://${serverHost}:${portNumber}/`, 'application/rdf+xml');

  try {
    res.set('Content-Type', 'application/rdf+xml');
    res.send(rdfData);
  } catch (err) {
    console.error(`Error generating RDF for endpoint: ${endpoint}`, err);
    res.status(500).send('Error generating RDF');
  }
});



app.get('/classes/:className/:endPoint', async (req, res, next) => {
  const endPoint = req.params.endPoint;
  const classEndPoints = rdfEndpoints[req.params.className];
  if (!classEndPoints) return res.status(404).send(`Class not found: ${req.params.className}`);

  endPointObject = classEndPoints[req.params.endPoint];
  if (!endPointObject) return res.status(404).send(`End point not found: ${req.params.endPoint}`);

  const generator = endPointObject.endPointMethod;
  if (!generator) return next();
  try {
    const rdfData = await generator(req);
    res.set('Content-Type', 'application/rdf+xml');
    res.send(rdfData);
  } catch (err) {
    console.error(`Error generating RDF for endpoint: ${endpoint}`, err);
    res.status(500).send('Error generating RDF');
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  // Do not open the browser at each restart.
  let browserOpenedContent = '';
  if (fs.existsSync('browser_opened.txt')) {
    browserOpenedContent = fs.readFileSync('browser_opened.txt', 'utf8');
  }
  if (!browserOpenedContent) {
    open(`http://localhost:${port}`);
    fs.writeFileSync('browser_opened.txt', 'true');
  }
});