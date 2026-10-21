import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {db} from '../packages/database/src/index';
import {exportSellerCatalog,importSellerCatalog} from '../packages/integrations/src/catalog-transfer';
const [mode,path]=process.argv.slice(2);
try{
 if(!path||!['export','import'].includes(mode))throw new Error('Usage: tsx scripts/transfer-catalog.ts export|import <private-file>');
 if(mode==='export'){
  const target=resolve(path),root=resolve('.runtime')+'/';
  if(!target.startsWith(root))throw new Error('Keep catalog snapshots in ignored .runtime/ storage.');
  const data=await exportSellerCatalog();await mkdir(dirname(target),{recursive:true});await writeFile(target,JSON.stringify(data),{mode:0o600,flag:'wx'});
  console.log(`Catalog-only snapshot saved privately: ${data.sellers.length} shops, ${data.products.length} products, ${data.listings.length} listings. No sessions or payments.`);
 }else{
  if(process.env.PACTRA_ALLOW_CATALOG_IMPORT!=='fresh-staging')throw new Error('Set PACTRA_ALLOW_CATALOG_IMPORT=fresh-staging for the deliberately selected empty target.');
  const result=await importSellerCatalog(JSON.parse(await readFile(path,'utf8')));console.log(JSON.stringify(result));
 }
}catch{console.error('Catalog transfer stopped. Check the private file, validation, active reservations and empty target requirements. No reset is available.');process.exitCode=1;}
finally{await db.$disconnect();}
