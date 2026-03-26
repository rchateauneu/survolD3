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

function minimalRdfContent(serverHost, portNumber) {
  const store = $rdf.graph();
  const subj = $rdf.namedNode(`http://${serverHost}:${port}/Survol/survol/entity.py?xid=CIM_ComputerSystem.Name=${serverHost}`);

  store.add(subj, RDFS('label'), $rdf.literal(serverHost));
  store.add(subj, LDT('Name'), $rdf.literal(serverHost));
  store.add(subj, RDF('type'), LDT('CIM_ComputerSystem'));
  return store;
}

function getHostPort(req) {
  const hostHeader = req.get('host') || `localhost:${port}`;
  const [host, maybePort] = hostHeader.split(':');
  const portNumber = maybePort || port;
  const serverHost = host || 'localhost';
  return [serverHost, portNumber];
}

rdfEndpoints = {};

rdfEndpoints["CIM_ComputerSystem"] = {
  top: {
    endPointComment : "Dummy endpoint to test RDF generation",
    endPointMethod: (req) => {
    [serverHost, portNumber] = getHostPort(req);
    const store = minimalRdfContent(serverHost, portNumber);
    return $rdf.serialize(null, store, `http://${serverHost}:${portNumber}/`, 'application/rdf+xml');
  }
  },
  processes_list: {
    endPointComment : "List of processes",
    endPointMethod: async (req) => {
    [serverHost, portNumber] = getHostPort(req);
    const store = await fillProcessesList(serverHost, portNumber);
    return $rdf.serialize(null, store, `http://${serverHost}:${portNumber}/`, 'application/rdf+xml');
    }
  }
};

app.get('/rdf', (req, res) => {
  res.set('Content-Type', 'text/turtle');
  res.send(`@prefix ex: <http://example.org/> .
ex:subject ex:predicate ex:object .
ex:another ex:rel ex:thing .`);
});

app.get('/classes/:className/:endPoint', async (req, res, next) => {
  const endpoint = req.params.endPoint;
  const generator = rdfEndpoints[req.params.className]?.[endpoint]?.endPointMethod;
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