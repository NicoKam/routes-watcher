import scanDir from './scanDir';
import toRoute from './toRoute';

async function run() {
  const dirTree = await scanDir('D:/project/digit-epidemic-screen-fe/src/pages', {
    ignore: [/\/components\//, /\/layouts\//],
  });
  const route = toRoute(dirTree);
  console.log(JSON.stringify(route, null, 2));
}
run();
