import {spawn} from 'node:child_process';

/** One free web instance owns both processes; losing either stops the pair. */
export function runServices(services,{shutdownMs=25_000,stdio='inherit'}={}) {
  if(!services.length)throw new Error('At least one service is required.');
  return new Promise(resolve=>{
    let stopping=false,exitCode=0,timer;
    const closed=new Set();
    const children=services.map(service=>({name:service.name,child:spawn(service.command,service.args,{cwd:service.cwd,env:service.env||process.env,stdio})}));
    const signals=['SIGTERM','SIGINT'];
    const onSignal=()=>stop(0);
    function finish(){if(closed.size!==children.length)return;clearTimeout(timer);for(const signal of signals)process.off(signal,onSignal);resolve(exitCode);}
    function stop(code){
      if(stopping)return;
      stopping=true;exitCode=code;
      for(const {child} of children)if(child.exitCode===null&&!closed.has(child))child.kill('SIGTERM');
      timer=setTimeout(()=>{for(const {child}of children)if(!closed.has(child))child.kill('SIGKILL');},shutdownMs);
      timer.unref();finish();
    }
    for(const signal of signals)process.on(signal,onSignal);
    for(const {name,child}of children){
      child.on('error',()=>{console.error(`${name} could not start. Restarting the service pair.`);stop(1);});
      child.on('close',(code,signal)=>{
        closed.add(child);
        if(!stopping){console.error(`${name} stopped (${signal||code}). Restarting the service pair.`);stop(1);}
        finish();
      });
    }
  });
}
