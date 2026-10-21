import {it,expect} from 'vitest';
import {spawn} from 'node:child_process';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const supervisor=new URL('../scripts/service-supervisor.mjs',import.meta.url).href;
async function fixture(fail:boolean) {
 const directory=await mkdtemp(join(tmpdir(),'pactra-service-'));
 const childFile=join(directory,'child.mjs'),entry=join(directory,'entry.mjs'),ready=join(directory,'ready'),stopped=join(directory,'stopped');
 await writeFile(childFile,`import{writeFileSync}from'node:fs';writeFileSync(${JSON.stringify(ready)},'ready');process.on('SIGTERM',()=>{writeFileSync(${JSON.stringify(stopped)},'stopped');process.exit(0)});setInterval(()=>{},1000);`);
 const commands=[{name:'Resident worker',command:process.execPath,args:[childFile]}];
 if(fail)commands.push({name:'Failed web',command:process.execPath,args:['-e',`const fs=require('node:fs');setInterval(()=>{if(fs.existsSync(${JSON.stringify(ready)}))process.exit(7)},10);`]});
 await writeFile(entry,`import{runServices}from ${JSON.stringify(supervisor)};process.exitCode=await runServices(${JSON.stringify(commands)},{shutdownMs:1000,stdio:'ignore'});`);
 const child=spawn(process.execPath,[entry],{stdio:'ignore'});
 const exited=new Promise<number|null>(resolve=>child.on('exit',resolve));
 return{directory,child,exited,ready,stopped};
}
it('stops the resident worker and exits unsuccessfully when the web process fails',async()=>{
 const f=await fixture(true);
 try{expect(await f.exited).toBe(1);expect(await readFile(f.stopped,'utf8')).toBe('stopped');}
 finally{f.child.kill('SIGKILL');await rm(f.directory,{recursive:true,force:true});}
});
it('forwards shutdown and waits for its worker to finish',async()=>{
 const f=await fixture(false);
 try{
  await expect.poll(async()=>readFile(f.ready,'utf8'),{timeout:3000}).toBe('ready');
  f.child.kill('SIGTERM');expect(await f.exited).toBe(0);expect(await readFile(f.stopped,'utf8')).toBe('stopped');
 }finally{f.child.kill('SIGKILL');await rm(f.directory,{recursive:true,force:true});}
});
