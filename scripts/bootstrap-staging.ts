import {db} from '../packages/database/src/index';
import {importSellerCatalog} from '../packages/integrations/src/catalog-transfer';
try{
 if(!process.env.PACTRA_CATALOG_JSON)throw new Error('Missing approved staging catalog.');
 const result=await importSellerCatalog(JSON.parse(process.env.PACTRA_CATALOG_JSON));
 console.log(`Staging catalog ${result.imported?'imported':'already initialized'}: ${result.sellers} shops, ${result.products} products, ${result.listings} listings.`);
}catch{console.error('Staging catalog initialization stopped. Check the approved private snapshot and fresh target; existing records are never overwritten.');process.exitCode=1;}
finally{await db.$disconnect();}
