APP.js is the server.  Run using nodejs from the command line, the single argument should be the port to listen on.  Make sure you portforward it:

node APP.js port

to run it, you'll need a few modules, install them with npm (comes with nodejs)

npm install socket.io
npm install underscore

index.html is the page that will be seen by clients.  Make sure the two files are in the same directory.