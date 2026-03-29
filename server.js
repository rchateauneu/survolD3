const express = require('express');
const cors = require('cors');
const $rdf = require('rdflib');
const si = require('systeminformation');
const fs = require('fs');
const open = require('open');
const os = require('os');
const { createMoniker, LDT, RDF, RDFS } = require('./utils');
const { generateMenu } = require('./menus');

const app = express();
app.use(cors());
app.use(express.static('.'));

const hostname = os.hostname();
const port = 8765;



/*
Processing process  {
  pid: 40248,
  parentPid: 19208,
  name: 'conhost.exe',
  cpu: 2.3296815970345689e-7,
  cpuu: 2.3296815970345689e-7,
  cpus: 0,
  mem: 0.04985641110990076,
  priority: 8,
  memVsz: 2848,
  memRss: 8220,
  nice: 0,
  started: '2026-03-29 17:43:43',
  state: 'unknown',
  tty: '',
  user: '',
  command: '\\??\\C:\\WINDOWS\\system32\\conhost.exe 0x4',
  path: 'C:\\WINDOWS\\system32\\conhost.exe',
  params: ''
}
*/
function fillProcess(store, windowOrigin, userName, parentPid, processName, processId) {
  //const processUri = `${baseUrl}?xid=CIM_Process.Handle=${processId}`;
  const processUri = createMoniker(windowOrigin, 'CIM_Process', { Handle: processId });
  const processNode = $rdf.namedNode(processUri);

  // <rdf:type rdf:resource="http://www.primhillcomputers.com/survol#CIM_Process"/>
  store.add(processNode, RDF('type'), LDT('CIM_Process'));

  // <ldt:account rdf:resource="http://<SERVER_HOST>:<PORT_NUMBER>/Survol/survol/entity.py?xid=LMI_Account.Name=<USER_NAME>,Domain=<SERVER_HOST>"/>
  if (userName == '') {
    userName = 'undefined_user';
  }
  const accountUri = createMoniker(windowOrigin, 'LMI_Account', { Name: userName, Domain: hostname });
  store.add(processNode, LDT('account'), $rdf.namedNode(accountUri));

  // <ldt:Handle>24</ldt:Handle> -> Using PID.
  store.add(processNode, LDT('Handle'), $rdf.literal(String(processId)));

  // <ldt:ppid rdf:resource="http://<SERVER_HOST>:<PORT_NUMBER>/Survol/survol/entity.py?xid=CIM_Process.Handle=<PARENT_PID>"/>
  const parentProcessUri = createMoniker(windowOrigin, 'CIM_Process', { Handle: parentPid });
  store.add(processNode, LDT('ppid'), $rdf.namedNode(parentProcessUri));

  // <rdfs:label><PROCESS_NAME></rdfs:label>
  store.add(processNode, RDFS('label'), $rdf.literal(processName));

  // <ldt:pid><PID></ldt:pid>
  store.add(processNode, LDT('pid'), $rdf.literal(String(processId)));
}

async function fillProcessesList(windowOrigin) {
  const store = $rdf.graph();

  detectedProcesses = new Set();
  detectedParents = new Set();

  try {
    const data = await si.processes();
    data.list.forEach(p => {
      detectedProcesses.add(p.pid);
      detectedParents.add(p.parentPid);
      fillProcess(store, windowOrigin, p.user, p.parentPid, p.name, p.pid);
    });
  } catch (error) {
    console.error("Error getting process list:", error);
  }
  undefinedProcs = new Set([...detectedParents].filter(x => !detectedProcesses.has(x)));
  undefinedProcs.forEach(pid => {
    console.warn(`Parent PID ${pid} not found in process list. Adding placeholder node.`);
    fillProcess(store, windowOrigin, 'unknown_user', 'unknown_parent_pid', `Unknown Process ${pid}`, pid);
  });
  console.log(`Leaving with ${detectedProcesses.size} processes and ${undefinedProcs.size} undefined parent processes.`);
  return store;
}

// This is used for testing purposes, to check that the server can receive events from WMI and update the RDF store accordingly.
function minimalRdfContent(windowOrigin) {
  const store = $rdf.graph();
  const uriHostname = createMoniker(windowOrigin, 'CIM_ComputerSystem', { Name: serverHost });
  const nodeHostname = $rdf.namedNode(uriHostname);

  store.add(nodeHostname, RDFS('label'), $rdf.literal(serverHost));
  store.add(nodeHostname, LDT('Name'), $rdf.literal(serverHost));
  store.add(nodeHostname, RDF('type'), LDT('CIM_ComputerSystem'));
  return store;
}

function getHostPort(req) {
  const hostHeader = req.get('host') || `localhost:${port}`;
  const [host, maybePort] = hostHeader.split(':');
  const portNumber = maybePort || port;
  const serverHost = host || 'localhost';
  return [serverHost, portNumber];
}

function refToWindowOrigin(req) {
      [serverHost, portNumber] = getHostPort(req);
      const windowOrigin = `http://${serverHost}:${portNumber}`;
      console.log(`Computed windowOrigin: ${windowOrigin} from serverHost: ${serverHost} and portNumber: ${portNumber}`);
      return windowOrigin;
}

function serializeRdfStore(res, rdfStore, windowOrigin) {
  try {
    const rdfData = $rdf.serialize(null, rdfStore, windowOrigin, 'application/rdf+xml');
    res.set('Content-Type', 'application/rdf+xml');
    res.send(rdfData);
  } catch (err) {
    console.error(`Error generating RDF for windowOrigin: ${windowOrigin}`, err);
    res.status(500).send('Error generating RDF');
  }
}

/* This map can be filled several ways:
- Hard-coded at server startup, with all endpoints. This is the simplest to implement, but not the most flexible.
  It works even without WMI or WBEM.
- Dynamically, based on class hierarchies.
- Based on an entire hierarchy of WMI classes.
- Dynamically, based on the presence of files in a directory, which are not necessarily CGI endpoints, but which have an associated method to generate RDF data.
*/

rdfEndpoints = new Map();

rdfEndpoints.set(
  "CIM_ComputerSystem",
  new Map(
    [
    ["top", {
      endPointComment : "Dummy endpoint to test RDF generation",
      endPointMethod: (windowOrigin) => {
      const store = minimalRdfContent(windowOrigin);
      return store;
    }}
    ],
    ["processes_list", {
      endPointComment : "List of processes",    
      endPointMethod: async (windowOrigin) => {
      const store = await fillProcessesList(windowOrigin);
      return store;
      }
    }]
  ]));

app.get('/menu/:className', (req, res, next) => {
  console.log(`Received menu request for class: ${req.params.className}`);
  rdfEndpoints.forEach((value, key) => {
    console.log(`rdfEndpoints element: ${key}`, value);
  });
  console.log("================================");

  const classEndPoints = rdfEndpoints.get(req.params.className);
  if (!classEndPoints) return res.status(404).send(`Class not found: ${req.params.className}`);

  classEndPoints.forEach((value, key) => {
    console.log(`classEndPoint element: ${key}`, value);
  });
  console.log("================================");

  const windowOrigin = refToWindowOrigin(req);
  const rdfStore = generateMenu(req.params.className, classEndPoints, windowOrigin);
  serializeRdfStore(res, rdfStore, windowOrigin);
});

app.get('/classes/:className/:endPoint', async (req, res, next) => {
  const endPoint = req.params.endPoint;
  console.log(`Received request for class: ${req.params.className}, endpoint: ${endPoint}`);
  const classEndPoints = rdfEndpoints.get(req.params.className);
  if (!classEndPoints) return res.status(404).send(`Class not found: ${req.params.className}`);

  const endPointObject = classEndPoints.get(req.params.endPoint);
  if (!endPointObject) return res.status(404).send(`End point not found: ${req.params.endPoint}`);

  const generator = endPointObject.endPointMethod;
  if (!generator) return next();
  const windowOrigin = refToWindowOrigin(req);
  const rdfStore = await generator(windowOrigin);
  serializeRdfStore(res, rdfStore, windowOrigin);
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