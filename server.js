const express = require('express');
const cors = require('cors');
const $rdf = require('rdflib');
const si = require('systeminformation');

const app = express();
const port = 8765;

const LDT = $rdf.Namespace("http://www.primhillcomputers.com/survol#");
const RDF = $rdf.Namespace("http://www.w3.org/1999/02/22-rdf-syntax-ns#");
const RDFS = $rdf.Namespace("http://www.w3.org/2000/01/rdf-schema#");

detectedProcesses = new Set();
detectedParents = new Set();

function fillProcess(rdf, SERVER_HOST, PORT_NUMBER, USER_NAME, PARENT_PID, PROCESS_NAME, PID) {
  detectedProcesses.add(PID);
  detectedParents.add(PARENT_PID);

  const baseUrl = `http://${SERVER_HOST}:${PORT_NUMBER}/Survol/survol/entity.py`;

  const processUri = `${baseUrl}?xid=CIM_Process.Handle=${PID}`;
  const processNode = $rdf.namedNode(processUri);

  // <rdf:type rdf:resource="http://www.primhillcomputers.com/survol#CIM_Process"/>
  rdf.add(processNode, RDF('type'), LDT('CIM_Process'));

  // <ldt:account rdf:resource="http://<SERVER_HOST>:<PORT_NUMBER>/Survol/survol/entity.py?xid=LMI_Account.Name=<USER_NAME>,Domain=<SERVER_HOST>"/>
  const accountUri = `${baseUrl}?xid=LMI_Account.Name=${USER_NAME},Domain=${SERVER_HOST}`;
  rdf.add(processNode, LDT('account'), $rdf.namedNode(accountUri));

  // <ldt:Handle>24</ldt:Handle> -> Using PID.
  rdf.add(processNode, LDT('Handle'), $rdf.literal(String(PID)));

  // <ldt:ppid rdf:resource="http://<SERVER_HOST>:<PORT_NUMBER>/Survol/survol/entity.py?xid=CIM_Process.Handle=<PARENT_PID>"/>
  const parentProcessUri = `${baseUrl}?xid=CIM_Process.Handle=${PARENT_PID}`;
  rdf.add(processNode, LDT('ppid'), $rdf.namedNode(parentProcessUri));

  // <rdfs:label><PROCESS_NAME></rdfs:label>
  rdf.add(processNode, RDFS('label'), $rdf.literal(PROCESS_NAME));

  // <ldt:pid><PID></ldt:pid>
  rdf.add(processNode, LDT('pid'), $rdf.literal(String(PID)));
}

async function fillProcessesList(SERVER_HOST, PORT_NUMBER) {
  const rdf = $rdf.graph();

  try {
    const data = await si.processes();
    data.list.forEach(p => {
      fillProcess(rdf, SERVER_HOST, PORT_NUMBER, p.user, p.parentPid, p.name, p.pid);
    });
  } catch (error) {
    console.error("Error getting process list:", error);
  }
  undefinedProcs = new Set([...detectedParents].filter(x => !detectedProcesses.has(x)));
  undefinedProcs.forEach(pid => {
    console.warn(`Parent PID ${pid} not found in process list. Adding placeholder node.`);
    fillProcess(rdf, SERVER_HOST, PORT_NUMBER, 'unknown', 'unknown', `Unknown Process ${pid}`, pid);
  });
  return rdf;
}

app.use(cors());
app.use(express.static('.'));


/*
Desfois, on dirait que des processes n'apparaissent que comme des ppid:

statements Statement: http://example.org/Survol/survol/entity.py?xid=CIM_Process.Handle=19920 http://www.primhillcomputers.com/survol#ppid http://example.org/Survol/survol/entity.py?xid=CIM_Process.Handle=12124
(index):360 Statement: http://example.org/Survol/survol/entity.py?xid=CIM_Process.Handle=19920 http://www.primhillcomputers.com/survol#ppid http://example.org/Survol/survol/entity.py?xid=CIM_Process.Handle=12124 Object type: NamedNode
(index):353 Adding node for url: http://example.org/Survol/survol/entity.py?xid=CIM_Process.Handle=12124 with class: CIM_Process
(index):397 Added link: http://example.org/Survol/survol/entity.py?xid=CIM_Process.Handle=19920 -> http://example.org/Survol/survol/entity.py?xid=CIM_Process.Handle=12124
(index):419 Node: http://example.org/Survol/survol/entity.py?xid=CIM_Process.Handle=12124 Class: CIM_Process Label: entity.py Literals: 0
(index):453 Processing node: http://example.org/Survol/survol/entity.py?xid=CIM_Process.Handle=12124 with class: CIM_Process

Confirmation en ligne de commande.

En tout cas, il faut un bon label par defaut, avec le pid, pour que ce soit visible dans le graph. Sinon, on a des nodes sans label, et c'est pas top.
*/



// Pluggable RDF endpoints (add more keys here)
const rdfEndpoints = {
  top: (req) => {
    const hostHeader = req.get('host') || `localhost:${port}`;
    const [host, maybePort] = hostHeader.split(':');
    const portNumber = maybePort || port;
    const serverHost = host || 'localhost';

    const store = $rdf.graph();
    const subj = $rdf.namedNode(`http://${serverHost}:${portNumber}/Survol/survol/entity.py?xid=CIM_ComputerSystem.Name=${serverHost}`);
    const predLabel = $rdf.namedNode('http://www.w3.org/2000/01/rdf-schema#label');
    const predName = $rdf.namedNode('http://www.primhillcomputers.com/survol#Name');
    const predType = $rdf.namedNode('http://www.w3.org/1999/02/22-rdf-syntax-ns#type');
    const objType = $rdf.namedNode('http://www.primhillcomputers.com/survol#CIM_ComputerSystem');

    store.add(subj, predLabel, $rdf.literal(serverHost));
    store.add(subj, predName, $rdf.literal(serverHost));
    store.add(subj, predType, objType);

    return $rdf.serialize(null, store, null, 'application/rdf+xml');
  },
  processes_list: async (req) => {
    const hostHeader = req.get('host') || `localhost:${port}`;
    const [host, maybePort] = hostHeader.split(':');
    const portNumber = maybePort || port;
    const serverHost = host || 'localhost';

    const store = await fillProcessesList(serverHost, portNumber);
    return $rdf.serialize(null, store, `http://${serverHost}:${portNumber}/`, 'application/rdf+xml');
  }
};

app.get('/rdf', (req, res) => {
  res.set('Content-Type', 'text/turtle');
  res.send(`@prefix ex: <http://example.org/> .
ex:subject ex:predicate ex:object .
ex:another ex:rel ex:thing .`);
});

app.get('/:endpoint', async (req, res, next) => {
  const endpoint = req.params.endpoint;
  const generator = rdfEndpoints[endpoint];
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
  const open = require('open');
  open(`http://localhost:${port}`);
});