import { createFileRoute } from "@tanstack/react-router";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { useForm } from "@tanstack/react-form";
import { api } from "../lib/api";
// import * as React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { toast, Toaster } from "sonner";

export const Route = createFileRoute("/update")({
  component: updatePackage,
});

function updatePackage() {
    const form = useForm({
      defaultValues: {
        ID: "",
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
        const { ID, metadata, data } = value;
  
        // Check if the ID is empty
        if (!ID) {
          toast.error("ID is required.");
          return;
        }
  
        // Create payload object without ID
        const payload = { metadata, data };
  
        // Send POST request to backend
        const res = await api.package[":ID"].$post({
          param: { ID },
          json: payload,
        });
  
        if (res.status === 200) {
          toast.success("Package updated successfully!");
        } else if (res.status === 400 || res.status === 404) {
          const error = await res.json();
          if ("error" in error) {
            toast.error(error.error);
          }
        } else {
          toast.error("An unexpected error occurred.");
        }
      },
    });
  
    return (
      <div className="flex flex-col items-center justify-center p-4">
        <Card className="w-[500px]">
          <CardHeader>
            <CardTitle>Update Package</CardTitle>
            <CardDescription>Update your package details below.</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void form.handleSubmit();
              }}
              className="max-w-xl w-full"
            >
              <form.Field
                name="ID"
                children={(field) => (
                  <>
                    <Label htmlFor={field.name}> Package ID</Label>
                    <Input
                      id={field.name}
                      name={field.name}
                      placeholder="Enter Package ID to Update"
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
                  {field.state.meta.isTouched &&
                  field.state.meta.errors.length ? (
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
                  {field.state.meta.isTouched &&
                  field.state.meta.errors.length ? (
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
                  {field.state.meta.isTouched &&
                  field.state.meta.errors.length ? (
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
                  {field.state.meta.isTouched &&
                  field.state.meta.errors.length ? (
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
                  <Select
                    onValueChange={(value) => field.handleChange(value === "True")}
                  >
                    <SelectTrigger id="framework">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent position="popper">
                      <SelectItem value="True">True</SelectItem>
                      <SelectItem value="False">False</SelectItem>
                    </SelectContent>
                  </Select>
                  {field.state.meta.isTouched &&
                  field.state.meta.errors.length ? (
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
                  {field.state.meta.isTouched &&
                  field.state.meta.errors.length ? (
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
        </CardContent>
      </Card>
    </div>
  );
}
