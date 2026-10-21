import {fileURLToPath} from 'node:url';
import {runServices} from './service-supervisor.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
const web=fileURLToPath(new URL('../apps/web/',import.meta.url));
const next=fileURLToPath(new URL('../apps/web/node_modules/next/dist/bin/next',import.meta.url));
console.log('Starting Pactra web and durable worker on one instance. Idle sleep pauses both.');
process.exitCode=await runServices([
  {name:'Web',command:process.execPath,args:[next,'start','--hostname','0.0.0.0','--port',process.env.PORT||'3100'],cwd:web},
  {name:'Worker',command:process.execPath,args:['--import','tsx','apps/worker/src/index.ts'],cwd:root},
]);
