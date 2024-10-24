import { createFileRoute } from "@tanstack/react-router";

import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";

interface PackageMetadata {
  Name: string;
  Version: string;
  ID: string;
}

export const Route = createFileRoute("/packages")({
  component: Index,
});

// Fetch packages from the API server
async function getPackages() {
  const response = await api.packages.$get();
  if (!response.ok) {
    throw new Error(`Error fetching packages: ${response.statusText}`);
  }
  const data = await response.json();
  // map metadata from response
  const metadataOnly = data.packages.map(
    (pkg: { metadata: PackageMetadata }) => pkg.metadata
  );
  return metadataOnly;
}

function Index() {
  // Fetch packages using query
  const { isPending, error, data } = useQuery({
    queryKey: ["get-all-packages"],
    queryFn: getPackages,
  });

  // Handle loading and error states
  if (isPending) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;
  const packages = data as PackageMetadata[];

  return (
    <div className="p-2 m-auto max-w-4xl">
      <Table>
        <TableCaption>A list of your recent packages.</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Name</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>ID</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {packages.map((pkg) => (
            <TableRow key={pkg.ID}>
              <TableCell className="font-medium">{pkg.Name}</TableCell>
              <TableCell>{pkg.Version}</TableCell>
              <TableCell>{pkg.ID}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2}>Total Packages</TableCell>
            <TableCell className="text-right">{packages.length}</TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
