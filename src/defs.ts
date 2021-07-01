export type FileObject = {
  path: string;
  name: string;
  isFile: true;
  suffix: string;
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
