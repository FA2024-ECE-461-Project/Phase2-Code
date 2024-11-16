import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { useForm } from "@tanstack/react-form";
import { api } from "../lib/api";

// frontend route "/upload" to upload a package named Route
export const Route = createFileRoute("/upload")({
  component: uploadPackage,
});

function uploadPackage() {
  // Use the navigate hook to redirect the user
  const navigate = useNavigate();

  // Create a form
  const form = useForm({
    defaultValues: {
      name: "Insert Package Name",
      version: "Insert Package Version",
    },
    onSubmit: async ({ value }) => {
      // Submit the form to the API to /packages endpoint
      const res = await api.package.$post({ json: value });

      // Handle errors
      if (!res.ok) {
        throw new Error(`Error uploading package: ${res.statusText}`);
      }
      // Redirect the user to the packages page
      navigate({ to: "/package" });
    },
  });

  // Render the form
  return (
    <div className="p-2 m-auto max-w-4xl">
      <h3>Upload a package</h3>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
        className=" max-w-xl m-auto"
      >
        <form.Field
          name="name"
          children={(field) => (
            <>
              <Label htmlFor={field.name}>Package name</Label>
              <Input
                id={field.name}
                name={field.name}
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
          name="version"
          children={(field) => (
            <>
              <Label htmlFor={field.name}>Package version</Label>
              <Input
                id={field.name}
                name={field.name}
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
        <Label htmlFor="package-file">Package file</Label>
        <Input id="package-file" type="file" />
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting ? "..." : "Upload"}
            </Button>
          )}
        />
      </form>
    </div>
  );
}
