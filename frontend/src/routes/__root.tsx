import { createRootRoute, Link, Outlet } from "@tanstack/react-router";
// import { TanStackRouterDevtools } from '@tanstack/router-devtools'

export const Route = createRootRoute({
  component: Root,
});

function NavBar() {
  return (
    <div className="p-2 flex gap-2">
      <Link to="/" className="[&.active]:font-bold">
        Home
      </Link>{" "}
      <Link to="/package" className="[&.active]:font-bold">
        Packages
      </Link>
      <Link to="/upload" className="[&.active]:font-bold">
        Upload
      </Link>
      <Link to="/search" className="[&.active]:font-bold">
        Search
      </Link>
    </div>
  );
}

function Root() {
  return (
    <>
      <NavBar />
      <hr />
      <Outlet />
      {/* <TanStackRouterDevtools /> */}
    </>
  );
}
