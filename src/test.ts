import scanDir from './scanDir';
import toRoute from './toRoute';

async function run() {
  const dirTree = await scanDir('D:/project/digit-epidemic-screen-fe/src/pages', {
    ignore: [/\/components\//, /\/layouts\//, /\/services\//],
  });
  const route = toRoute(dirTree, {
    filter: (obj) => {
      return (obj.name === 'index' || obj.name === '_layout') &&
      (obj.suffix === '.js' || obj.suffix === '.jsx' || obj.suffix === '.ts' || obj.suffix === '.tsx');
    },
  });
  console.log(JSON.stringify(route, null, 2));
}
run();
