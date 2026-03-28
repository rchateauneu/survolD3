// Detection creation et destruction de processes.
const { spawn } = require('child_process');
const EventEmitter = require('events');

class WmiWatcher extends EventEmitter {
    constructor(wqlQuery) {
        super();
        this.wqlQuery = wqlQuery;
        this.ps = null;
    }

    start() {
        const script = `
        $q = "${this.wqlQuery}"

        Register-WmiEvent -Query $q -SourceIdentifier "WmiEvent"

        while ($true) {
			
            $event = Wait-Event -SourceIdentifier "WmiEvent"
            $obj = $event.SourceEventArgs.NewEvent.TargetInstance

            $name = $obj.Name
            $processId  = $obj.ProcessId

            Write-Output "$name|$processId "
            Remove-Event -EventIdentifier $event.EventIdentifier
        }
        `;

        this.ps = spawn('powershell.exe', [
            '-NoProfile',
            '-Command',
            script
        ]);

        this.ps.stdout.on('data', (data) => {
            const lines = data.toString().trim().split('\n');

            for (let line of lines) {
                const [name, pid] = line.trim().split('|');
                this.emit('event', { name, pid: Number(pid) });
            }
        });

        this.ps.stderr.on('data', (err) => {
            console.error('PowerShell error:', err.toString());
        });

        this.ps.on('exit', () => {
            this.emit('stop');
        });
    }

    stop() {
        if (this.ps) {
            this.ps.kill();
        }
    }
}

module.exports = WmiWatcher;


////////////////////////////////////////

const createWatcher = new WmiWatcher(
    "SELECT * FROM __InstanceCreationEvent WITHIN 1 WHERE TargetInstance ISA 'Win32_Process'"
);

const deleteWatcher = new WmiWatcher(
    "SELECT * FROM __InstanceDeletionEvent WITHIN 1 WHERE TargetInstance ISA 'Win32_Process'"
);

createWatcher.on('event', e => console.log('[+] ', e));
deleteWatcher.on('event', e => console.log('[-] ', e));

createWatcher.start();
deleteWatcher.start();

////////////////////////////////////////
////////////////////////////////////////
/*
Pas la peine de creer un super-menu de toutes les classes pour ajouter des watcher.
On hard-code les processes et peut-etre les sockets en leur ajoutant des watchers et c'est tout.

Les watcher envoie tout dans un store RDF unique, que le client va lire a intervalles reguliers.
*/