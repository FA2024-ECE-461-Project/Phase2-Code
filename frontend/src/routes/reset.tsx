import { createFileRoute } from "@tanstack/react-router";
import { api } from "../lib/api";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Button } from "../components/ui/button"; // Assume you have a reusable button component
import { toast } from "sonner";
import { RefreshCw } from "lucide-react"; // Use a refresh icon for reset

export const Route = createFileRoute("/reset")({
  component: resetRegistry,
});

// Trigger reset endpoint
async function resetDatabase() {
  const res = await api.reset.$delete();
  if (!res.ok) {
    throw new Error(`Error resetting database: ${res.statusText}`);
  }
  return res.json();
}

function resetRegistry() {
  // Access the query client
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null); // State for success/error message

  // Define mutation for reset functionality
  const mutation = useMutation({
    mutationFn: resetDatabase, // Function to reset the database
    onError: () => {
      setMessage("Failed to Reset Package Registry"); // Set error message
      toast("Error", {
        description: `Failed to Reset Package Registry`, // Show error toast on failure
      });
    },
    onSuccess: () => {
      setMessage("Successfully Reset Package Registry"); // Set success message
      toast("Success", {
        description: `Successfully Reset Package Registry`, // Show success toast on success
      });

      // Invalidate all queries to ensure they are refetched
      queryClient.invalidateQueries();
    },
  });

  return (
    <div className="p-4 flex flex-col items-center">
      <h1 className="text-2xl font-bold mb-4">Reset Database</h1>
      <Button
        disabled={mutation.isPending}
        onClick={() => mutation.mutate()}
        variant="destructive"
        className="flex items-center gap-2 px-4 py-2"
      >
        {mutation.isPending ? (
          <>
            <RefreshCw className="animate-spin h-5 w-5" />
            Resetting...
          </>
        ) : (
          <>
            <RefreshCw className="h-5 w-5" />
            Reset Database
          </>
        )}
      </Button>
      {message && (
        <p className={`mt-4 ${mutation.isError ? "text-500" : "text-500"}`}>
          {message}
        </p>
      )}
    </div>
  );
}