/* prettier-ignore-start */

/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file is auto-generated by TanStack Router

// Import Routes

import { Route as rootRoute } from "./routes/__root";
import { Route as UploadImport } from "./routes/upload";
import { Route as UpdateImport } from "./routes/update";
import { Route as SearchImport } from "./routes/search";
import { Route as ResetImport } from "./routes/reset";
import { Route as RateImport } from "./routes/rate";
import { Route as PackageImport } from "./routes/package";
import { Route as ByRegExImport } from "./routes/byRegEx";
import { Route as IndexImport } from "./routes/index";

// Create/Update Routes

const UploadRoute = UploadImport.update({
  id: "/upload",
  path: "/upload",
  getParentRoute: () => rootRoute,
} as any);

const UpdateRoute = UpdateImport.update({
  id: "/update",
  path: "/update",
  getParentRoute: () => rootRoute,
} as any);

const SearchRoute = SearchImport.update({
  id: "/search",
  path: "/search",
  getParentRoute: () => rootRoute,
} as any);

const ResetRoute = ResetImport.update({
  id: "/reset",
  path: "/reset",
  getParentRoute: () => rootRoute,
} as any);

const RateRoute = RateImport.update({
  id: "/rate",
  path: "/rate",
  getParentRoute: () => rootRoute,
} as any);

const PackageRoute = PackageImport.update({
  id: "/package",
  path: "/package",
  getParentRoute: () => rootRoute,
} as any);

const ByRegExRoute = ByRegExImport.update({
  id: "/byRegEx",
  path: "/byRegEx",
  getParentRoute: () => rootRoute,
} as any);

const IndexRoute = IndexImport.update({
  id: "/",
  path: "/",
  getParentRoute: () => rootRoute,
} as any);

// Populate the FileRoutesByPath interface

declare module "@tanstack/react-router" {
  interface FileRoutesByPath {
    "/": {
      id: "/";
      path: "/";
      fullPath: "/";
      preLoaderRoute: typeof IndexImport;
      parentRoute: typeof rootRoute;
    };
    "/byRegEx": {
      id: "/byRegEx";
      path: "/byRegEx";
      fullPath: "/byRegEx";
      preLoaderRoute: typeof ByRegExImport;
      parentRoute: typeof rootRoute;
    };
    "/package": {
      id: "/package";
      path: "/package";
      fullPath: "/package";
      preLoaderRoute: typeof PackageImport;
      parentRoute: typeof rootRoute;
    };
    "/rate": {
      id: "/rate";
      path: "/rate";
      fullPath: "/rate";
      preLoaderRoute: typeof RateImport;
      parentRoute: typeof rootRoute;
    };
    "/reset": {
      id: "/reset";
      path: "/reset";
      fullPath: "/reset";
      preLoaderRoute: typeof ResetImport;
      parentRoute: typeof rootRoute;
    };
    "/search": {
      id: "/search";
      path: "/search";
      fullPath: "/search";
      preLoaderRoute: typeof SearchImport;
      parentRoute: typeof rootRoute;
    };
    "/update": {
      id: "/update";
      path: "/update";
      fullPath: "/update";
      preLoaderRoute: typeof UpdateImport;
      parentRoute: typeof rootRoute;
    };
    "/upload": {
      id: "/upload";
      path: "/upload";
      fullPath: "/upload";
      preLoaderRoute: typeof UploadImport;
      parentRoute: typeof rootRoute;
    };
  }
}

// Create and export the route tree

export interface FileRoutesByFullPath {
  "/": typeof IndexRoute;
  "/byRegEx": typeof ByRegExRoute;
  "/package": typeof PackageRoute;
  "/rate": typeof RateRoute;
  "/reset": typeof ResetRoute;
  "/search": typeof SearchRoute;
  "/update": typeof UpdateRoute;
  "/upload": typeof UploadRoute;
}

export interface FileRoutesByTo {
  "/": typeof IndexRoute;
  "/byRegEx": typeof ByRegExRoute;
  "/package": typeof PackageRoute;
  "/rate": typeof RateRoute;
  "/reset": typeof ResetRoute;
  "/search": typeof SearchRoute;
  "/update": typeof UpdateRoute;
  "/upload": typeof UploadRoute;
}

export interface FileRoutesById {
  __root__: typeof rootRoute;
  "/": typeof IndexRoute;
  "/byRegEx": typeof ByRegExRoute;
  "/package": typeof PackageRoute;
  "/rate": typeof RateRoute;
  "/reset": typeof ResetRoute;
  "/search": typeof SearchRoute;
  "/update": typeof UpdateRoute;
  "/upload": typeof UploadRoute;
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath;
  fullPaths:
    | "/"
    | "/byRegEx"
    | "/package"
    | "/rate"
    | "/reset"
    | "/search"
    | "/update"
    | "/upload";
  fileRoutesByTo: FileRoutesByTo;
  to:
    | "/"
    | "/byRegEx"
    | "/package"
    | "/rate"
    | "/reset"
    | "/search"
    | "/update"
    | "/upload";
  id:
    | "__root__"
    | "/"
    | "/byRegEx"
    | "/package"
    | "/rate"
    | "/reset"
    | "/search"
    | "/update"
    | "/upload";
  fileRoutesById: FileRoutesById;
}

export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute;
  ByRegExRoute: typeof ByRegExRoute;
  PackageRoute: typeof PackageRoute;
  RateRoute: typeof RateRoute;
  ResetRoute: typeof ResetRoute;
  SearchRoute: typeof SearchRoute;
  UpdateRoute: typeof UpdateRoute;
  UploadRoute: typeof UploadRoute;
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  ByRegExRoute: ByRegExRoute,
  PackageRoute: PackageRoute,
  RateRoute: RateRoute,
  ResetRoute: ResetRoute,
  SearchRoute: SearchRoute,
  UpdateRoute: UpdateRoute,
  UploadRoute: UploadRoute,
};

export const routeTree = rootRoute
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>();

/* prettier-ignore-end */

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/",
        "/byRegEx",
        "/package",
        "/rate",
        "/reset",
        "/search",
        "/update",
        "/upload"
      ]
    },
    "/": {
      "filePath": "index.tsx"
    },
    "/byRegEx": {
      "filePath": "byRegEx.tsx"
    },
    "/package": {
      "filePath": "package.tsx"
    },
    "/rate": {
      "filePath": "rate.tsx"
    },
    "/reset": {
      "filePath": "reset.tsx"
    },
    "/search": {
      "filePath": "search.tsx"
    },
    "/update": {
      "filePath": "update.tsx"
    },
    "/upload": {
      "filePath": "upload.tsx"
    }
  }
}
ROUTE_MANIFEST_END */
