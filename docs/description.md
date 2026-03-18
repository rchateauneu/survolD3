This project contains several components:
- A html page containing javascript code which connects to RDF urls and displays them using D3 javascript library. 
- A web server written in node (server side javascript) program which can receive queries and replies in RDF format. By default, it uses the port number 8765. At startup, it can open the aforementionned html page in the default browser.


* HTML page:
============
This page can be open by the server, but it also works when clicking on it and just opening it in a browser. It has a text input when one can enter a url returning RDF data. These RDF triples are cnverted to a D3 graph and displayed. A small window contains the list of loaded URLs.

The CORS policy to fix the error message "CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource."

It must be able to load a local file.

RDF text files (with extensions like .ttl, .rdf, .nt, .jsonld, .txt)

Ensure that it can load a RDF/XML file typically starting with "<rdf:Description rdf:about="https://www.w3.org/TR/rdf12-xml/">"

It must use the library rdflib.js
Consider:
<script src="https://cdn.jsdelivr.net/npm/rdflib@latest/dist/rdflib.min.js"></script>
or:
<script src="https://unpkg.com/rdflib@2.1.0/dist/rdflib.min.js"></script>
You can as well download them in node_modules.

The vertices must be connected by lines.

We want to associate CSS classes to the vertices,
The syntax of the nodes of the urls is for example:
http://vps516494.ovh.net:80/Survol/survol/entity.py?xid=LMI_Account.Name=root,Domain=vps516494.ovh.net
http://vps516494.ovh.net:80/Survol/survol/entity.py?xid=CIM_Process.Handle=673
The query of the URL (what comes after the questions mark) must be parsed.
It contains a class name, after the string "xid=" and before the dot.
Extract the class name and use it to choose a CSS class containing a color, and possibly other graphic attributes.
In these two example, the classes are "LMI_Account" and "CIM_Process".
It must be easy to add more CSS classes, so they should be in a separate file.
"LMI_Account" will be red, "CIM_Process" will be blue.

Some classes are hierarchical, for example "Linux/cgroup". They must be mapped to nested CSS classes. In this case:
.Linux {
    .group {
        fill:purple;
    }
}
This is a general pattern, the processing of classes must be dynamic, not hard-coded.

Each class has a CSS attribute giving its color. Now, each class also have a shape in the same CSS class. The default shape is rectangle. CIM_Process is drawn as a circle, LMI_Account as an ellipse.

The literal object values of RDF triples must not be matched to a D3 vertex.
Instead, they must be detected and stored with the subject.
Let us consider a RDF triple with a subject, a predicate and a literal object.
When hovering over the vertex of the subject, its literal values must be displayed in a temporary window, a table with two columns:
- The first column is a shortened form of the predicate.
- The second column is the literal value.

Now, we want to change the stroke and color of the links according to the predicate in each RDF triple. The predicates we are focusing on are the ones with the prefix xmlns:ldt="http://www.primhillcomputers.com/survol#" which must be a parameter. We are interested only by predicates between two URLs, not predicates to a litteral value. There are many predicates such as "ldt:cgroup", "ldt:directory", "ldt:account" etc... According to what comes after "ldt:", that is, "cgroup", "directory", "account", the stroke and color of the link will change and will be stored in CSS attributes. The default value is black for the color, and 1 for the stroke.
This must be dynamic, the predicates names must not be hard-coded.

When loading several times the same URL in different RDF documents, it must be displayed in the same D3 vertex.

It should be possible to zoom in and out the D3 frame, and scroll horizontally and vertically.

Most RDF URLs have a RDFS label stored as a litteral object value, and the predicate is rdfs:label. For example : <rdfs:label>sssd_nss</rdfs:label>.
This label must be displayed in the shape associated to the URL subject (circle, rectangle, ellipse, etc...). The size of the shape must be adjusted to the size of the label.


* Web server:
=============
The web server will send RDF graphs in RDF/XML format.
It must use a very common library for HTTP servers in node.
There will be at least two types of queries:
- Queries associated to our subjects, that is, to a vertex, everything which comes after "xid=". They will be in some way 
  defined by their classes, in a subdirectory with the name of their class. Their main argument will be the query of the url of the vertiex,
that is, "xid=<class name>.arg1=val1 etc..."
- General queries, without arguments.
The implementaion of the queries must be very flexible : Some of them will be a simple function, some others are implemented in their own node file.
There is at least 

Processes list:
---------------
In server.js, create a function named fillProcess which receives these arguments:
- a rdflib.js graph, named rdf
- the host address SERVER_HOST
- the port number PORT_NUMBER
- the user name USER_NAME,
- the parent process id PARENT_PID
- the process name PROCESS_NAME

With these arguments, it must add to the graph the following triples:
  <rdf:Description rdf:about="http://<SERVER_HOST>:<PORT_NUMBER>/Survol/survol/entity.py?xid=CIM_Process.Handle=<PID>">
    <rdf:type rdf:resource="http://www.primhillcomputers.com/survol#CIM_Process"/>
    <ldt:account rdf:resource="http://<SERVER_HOST>:<PORT_NUMBER>/Survol/survol/entity.py?xid=LMI_Account.Name=<USER_NAME>,Domain=<SERVER_HOST>"/>
    <ldt:Handle>24</ldt:Handle>
    <ldt:ppid rdf:resource="http://<SERVER_HOST>:<PORT_NUMBER>/Survol/survol/entity.py?xid=CIM_Process.Handle=<PARENT_PID>"/>
    <rdfs:label><PROCESS_NAME></rdfs:label>
    <ldt:pid><PID></ldt:pid>
  </rdf:Description>
Just add this function, do not touch anything else.


Now, in server.js, create a function named fillProcessesList, which creates a rdflib graph, and list all processes running on the machine
For each process, get the process id, the parent process id (PARENT_PID), the process name (PROCESS_NAME) and the user owning the process (USER_NAME). And then, it must call
the function fillProcess with the arguments : rdflib graph, SERVER_HOST, PORT_NUMBER, USER_NAME, PARENT_PID, PROCESS_NAME.
You must use the node.js package systeminformation
Just add this function, do not touch anything else.


Now, in server.js, create an endpoint named "processes_list". It must return the list of processes running on the current machine, in RDF format.
It will call the function fillProcessesList.
Just add this endpoint, do as few other changes as possible, and only if it simplifies the code.



