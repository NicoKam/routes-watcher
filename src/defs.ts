export type FileObject = {
  /** path relative to page root */
  path: string;
  /** filename */
  name: string;
  isFile: true;
  extname: string;
};

export type DirObject = {
  path: string;
  name: string;
  isDirectory: true;
  children: (DirObject | FileObject)[];
};

export type DirFileObject = FileObject | DirObject;

export interface RouteConfig {
  path: string;
  exact?: boolean;
  children?: Array<RouteConfig>;
  component?: string;
}
