import { createFileRoute } from "@tanstack/react-router";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { useForm } from "@tanstack/react-form";
import { api } from "../lib/api";
// import { useState } from "react";
// import { toast, Toaster } from "sonner";
import { Toaster } from "sonner";

export const Route = createFileRoute("/update")({
  component: updatePackage,
});

function updatePackage() {
  const form = useForm({
    defaultValues: {
      metadata: {
        Name: "",
        Version: "",
      },
      data: {
        Content: "",
        URL: "",
        debloat: false,
        JSProgram: "",
      },
    },
    onSubmit: async ({ value }) => {
        const { metadata, data } = value;
      
        // Validate Name and Version
        if (!metadata.Name || !metadata.Version) {
          alert("Please provide both Name and Version to update the package.");
          return;
        }
      
        // Construct ID
        const id = `${metadata.Name}@${metadata.Version}`;

        const payload = { metadata, data };
      
        // Send POST request to backend
        try {
          const res = await api.package[":ID"].$post({
            param: { ID: id },
            json: payload,
          });
      
          if (!res.ok) {
            const error = await res.json();
            throw new Error(`Error updating package: ${error}`);
          }
      
          const result = await res.json();
          console.log("Package updated successfully:", result);
          alert("Package updated successfully!");
        } catch (error) {
          console.error("Error updating package:", error);
          alert(`Error: ${error}`);
        }
      },
  });

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <h3 className="mb-4 text-lg font-semibold">Update a package</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
        className="max-w-xl w-full"
      >
        <form.Field
          name="metadata.Name"
          children={(field) => (
            <>
              <Label htmlFor={field.name}> Package Name</Label>
              <Input
                id={field.name}
                name={field.name}
                placeholder="Enter Name"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {field.state.meta.isTouched && field.state.meta.errors.length ? (
                <em>{field.state.meta.errors.join(", ")}</em>
              ) : null}
            </>
          )}
        />
        <form.Field
          name="metadata.Version"
          children={(field) => (
            <>
              <Label htmlFor={field.name}> Package Version</Label>
              <Input
                id={field.name}
                name={field.name}
                placeholder="Enter Version"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {field.state.meta.isTouched && field.state.meta.errors.length ? (
                <em>{field.state.meta.errors.join(", ")}</em>
              ) : null}
            </>
          )}
        />
        <form.Field
          name="data.Content"
          children={(field) => (
            <>
              <Label htmlFor={field.name}> Package Content</Label>
              <Input
                id={field.name}
                name={field.name}
                placeholder="Enter Content"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {field.state.meta.isTouched && field.state.meta.errors.length ? (
                <em>{field.state.meta.errors.join(", ")}</em>
              ) : null}
            </>
          )}
        />
        <form.Field
          name="data.URL"
          children={(field) => (
            <>
              <Label htmlFor={field.name}> Package URL</Label>
              <Input
                id={field.name}
                name={field.name}
                placeholder="Enter URL"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {field.state.meta.isTouched && field.state.meta.errors.length ? (
                <em>{field.state.meta.errors.join(", ")}</em>
              ) : null}
            </>
          )}
        />
        <form.Field
          name="data.debloat"
          children={(field) => (
            <>
              <Label htmlFor={field.name}> Debloat</Label>
              <Input
                type="checkbox"
                id={field.name}
                name={field.name}
                checked={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.checked)}
              />
              {field.state.meta.isTouched && field.state.meta.errors.length ? (
                <em>{field.state.meta.errors.join(", ")}</em>
              ) : null}
            </>
          )}
        />
        <form.Field
          name="data.JSProgram"
          children={(field) => (
            <>
              <Label htmlFor={field.name}> JS Program</Label>
              <Input
                id={field.name}
                name={field.name}
                placeholder="Enter JS Program"
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
              />
              {field.state.meta.isTouched && field.state.meta.errors.length ? (
                <em>{field.state.meta.errors.join(", ")}</em>
              ) : null}
            </>
          )}
        />
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit} className="mt-4">
              {isSubmitting ? "..." : "Update"}
            </Button>
          )}
        />
      </form>
      <Toaster /> {/* Add the toaster component */}
    </div>
  );
}
