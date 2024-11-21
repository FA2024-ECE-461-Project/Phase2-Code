import { createFileRoute } from "@tanstack/react-router";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { useForm } from "@tanstack/react-form";
import { api } from "../lib/api";
import { useState } from "react";
import { toast, Toaster } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
// import { Name } from "drizzle-orm";

// frontend route "/upload" to upload a package named Route
export const Route = createFileRoute("/upload")({
  component: uploadPackage,
});

function uploadPackage() {
  const [uploadMode, setUploadMode] = useState<"url" | "zip">("url");

  const form = useForm({
    defaultValues: {
      URL: "",
      Content: "",
      JSProgram: "",
      Name: "",
      debloat: false,
    },
    onSubmit: async ({ value }) => {
      // Initialize the payload object
      let payload: {
        URL?: string;
        Content?: string;
        Name?: string;
        JSProgram?: string;
        debloat?: boolean;
      } = {};
      
      // Name exists, set the payload
      payload = { Name: value.Name };

      // JSProgram is optional, set the payload if it exists
      if (value.JSProgram) {
        payload = { ...payload, JSProgram: value.JSProgram };
      }

      // debloat is optional, set the payload if it exists
      if (value.debloat) {
        payload = { ...payload, debloat: value.debloat };
      }

      // Check the upload mode and set the payload accordingly
      if (uploadMode === "url") {
        if (!value.URL) throw new Error("URL is required.");
        payload = { URL: value.URL, JSProgram: value.JSProgram};
      } else if (uploadMode === "zip") {
        if (!value.Content) throw new Error("Base64-encoded file is required.");
        payload = { Content: value.Content, Name: value.Name, debloat: value.debloat, JSProgram: value.JSProgram };
      }

      // Send the payload to the API
      const res = await api.package.$post({ json: payload });

      if (res.status === 201) {
        // Show a success toast on successful upload
        toast.success("Successfully Uploaded Package");
        // Navigate to the package page after successful upload
      } else if (res.status === 409) {
        // Show a conflict toast if there's a conflict
        toast.error("There's a conflict with the package");
      } else {
        // Show a failure toast for other errors
        toast.error(`Failed to upload package: ${res.statusText}`);
      }
    },
  });

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <h3 className="mb-4 text-lg font-semibold">Upload a package</h3>
      <div className="flex gap-4 mb-6">
        <Button
          variant={uploadMode === "url" ? "default" : "outline"} // Set the button variant based on the upload mode
          onClick={() => setUploadMode("url")}
        >
          Upload via URL
        </Button>
        <Button
          variant={uploadMode === "zip" ? "default" : "outline"} // Set the button variant based on the upload mode
          onClick={() => setUploadMode("zip")}
        >
          Upload via Base64
        </Button>
      </div>
      {/* This is the form to submit */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          void form.handleSubmit();
        }}
        className="max-w-xl w-full"
      >
        {uploadMode === "url" && (
          <form.Field
            name="URL"
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
                {/* {field.state.meta.isTouched && field.state.meta.errors.length ? (
                  <em>{field.state.meta.errors.join(", ")}</em>
                ) : null} */}
              </>
            )}
          />
        )}
        {uploadMode === "zip" && (
          <>
            <form.Field
              name="Name"
              children={(field) => (
                <>
                  <Label htmlFor={field.name}>Enter Package Name</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    placeholder="Enter Package Name"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </>
              )}
            />
            <form.Field
              name="Content"
              children={(field) => (
                <>
                  <Label htmlFor={field.name}>Upload Zip File</Label>
                  <Input
                    type="file"
                    id={field.name}
                    name={field.name}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </>
              )}
            />
            <form.Field
              name="debloat"
              children={(field) => (
                <>
                  <Label htmlFor={field.name}>Debloat</Label>
                  <Select
                    onValueChange={(value) =>
                      field.handleChange(value === "True")
                    }
                  >
                    {/* Updated SelectTrigger */}
                    <SelectTrigger id={field.name}>
                      <SelectValue placeholder="Select True or False" />
                    </SelectTrigger>

                    {/* Updated SelectContent */}
                    <SelectContent>
                      <SelectItem value="True">True</SelectItem>
                      <SelectItem value="False">False</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Error Display */}
                  {/* {field.state.meta.isTouched &&
              field.state.meta.errors.length ? (
                <em>{field.state.meta.errors.join(", ")}</em>
              ) : null} */}
                </>
              )}
            />
          </>
        )}
        {/* This is the submit button */}
        <form.Subscribe
          selector={(state) => [state.canSubmit, state.isSubmitting]}
          children={([canSubmit, isSubmitting]) => (
            <Button type="submit" disabled={!canSubmit} className="mt-4">
              {isSubmitting ? "..." : "Upload"}
            </Button>
          )}
        />
      </form>
      <Toaster /> {/* Add the toaster component */}
    </div>
  );
}
