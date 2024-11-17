import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { useForm } from "@tanstack/react-form";
import { api } from "../lib/api";
import { useState } from "react";

// frontend route "/upload" to upload a package named Route
export const Route = createFileRoute("/upload")({
  component: uploadPackage,
});

function uploadPackage() {
  const [uploadMode, setUploadMode] = useState<"url" | "zip">("url");
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: {
      url: "",
      content: "",
    },
    onSubmit: async ({ value }) => {
      //initialize the payload object
      let payload: { url?: string; content?: string } = {};

      //check the upload mode and set the payload accordingly
      if (uploadMode === "url") {
        if (!value.url) throw new Error("GitHub URL is required.");
        payload = { url: value.url };
      } else if (uploadMode === "zip") {
        if (!value.content) throw new Error("Base64-encoded file is required.");
        payload = { content: value.content };
      }

      //send the payload to the API
      const res = await api.package.$post({ json: payload });

      if (!res.ok) {
        throw new Error(`Error uploading package: ${res.statusText}`);
      }

      navigate({ to: "/package" });
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
          Upload via GitHub URL
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
            name="url"
            children={(field) => (
              <>
                <Label htmlFor={field.name}>GitHub Repository URL</Label>
                <Input
                  id={field.name}
                  name={field.name}
                  placeholder="Enter GitHub Repository URL"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.isTouched &&
                field.state.meta.errors.length ? (
                  <em>{field.state.meta.errors.join(", ")}</em>
                ) : null}
              </>
            )}
          />
        )}
        {uploadMode === "zip" && (
          <form.Field
            name="content"
            children={(field) => (
              <>
                <Label htmlFor="Upload Zip File">Upload Zip File</Label>
                <Input
                  type="file"
                  id={field.name}
                  name={field.name}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.isTouched &&
                field.state.meta.errors.length ? (
                  <em>{field.state.meta.errors.join(", ")}</em>
                ) : null}
              </>
            )}
          />
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
    </div>
  );
}
