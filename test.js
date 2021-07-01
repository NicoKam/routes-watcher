const glob = require('glob');
const { promises: fs } = require('fs');
const { promisify } = require('util');
const { join } = require('path');
const slash = require('slash');

// console.time('glob');
// const res = glob(
//   '**/*',
//   {
//     cwd: './',
//   },
//   (err, res) => {
//     console.log(res, res.length);
//     fs.writeFile('glob.json', JSON.stringify(res, null, 2));
//     console.timeEnd('glob');
//   },
// );

let num = 0;
async function scan(path, name = '') {
  const fullPath = slash(join(path, name));
  const stat = await fs.stat(fullPath);
  if (name[0] === '.') {
    return false;
  }

  if (stat.isFile()) {
    num += 1;
    if (name.indexOf('.') < 0) return false;
    return {
      path: fullPath,
    };
  } else if (stat.isDirectory()) {
    num += 1;
    const dirRes = await fs.readdir(fullPath);
    const children = await Promise.all(dirRes.map(async (name) => scan(fullPath, name))).then((res) =>
      res.filter((res) => !!res),
    );
    return {
      path: fullPath,
      children,
    };
  }

  return null;
}

console.time('fs');
scan('./').then((res) => {
  console.log(res);
  console.log(num);
  console.timeEnd('fs');
  fs.writeFile('./dir.json', JSON.stringify(res, null, 2));
  // let arr = [];
  // function rev({ path, children }) {
  //   arr.push(path);
  //   if (children) {
  //     children.map(rev);
  //   }
  // }
  // rev(res);
  // fs.writeFile('./dir-f.json', JSON.stringify(arr, null, 2));
});
