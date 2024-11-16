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

export const Route = createFileRoute("/package")({
  component: Index,
});

// Fetch packages from the API server
async function getPackages() {
  const res = await api.packages.$get();
  if (!res.ok) {
    throw new Error(`Error fetching packages: ${res.statusText}`);
  }
  const data = await res.json();

  return { data };
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
          {data.data.packages.map((packages) => (
            <TableRow key={packages.id}>
              <TableCell className="font-medium">{packages.name}</TableCell>
              <TableCell>{packages.version}</TableCell>
              <TableCell>{packages.id}</TableCell>
            </TableRow>
          ))}
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell colSpan={2}>Total Packages</TableCell>
            <TableCell className="text-right">
              {data.data.packages.length}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </div>
  );
}
