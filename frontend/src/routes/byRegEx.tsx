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
import { toast, Toaster } from "sonner";
// import { Regex } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute('/byRegEx')({
  component: PackageSearchRegEx,
})

interface PackageSearchRegExList {
  Name: string;
  Version: string;
  ID: string;
}

function PackageSearchRegEx() {
  const [result, setResult] = useState<PackageSearchRegExList[]>([]);
  const form = useForm({
    defaultValues: {
      RegEx: "",
    },
    onSubmit: async ({ value }) => {

      // Send POST request to backend
      const res = await api.package.byRegEx.$post({
        json: value
      });

      if (res.status === 200) {
        const data: PackageSearchRegExList[] = await res.json();        
        setResult(data);
        toast.success("Packages found!");
      } else if (res.status === 400) {
        toast.error("Invalid or Empty RegEx");
      } else if (res.status === 404){
        toast.error("No package found under this RegEx.");
      }
      else {
        toast.error("An unexpected error occurred.");
      }
    },
  });

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <Card className="w-[500px]">
        <CardHeader>
          <CardTitle>Search by RegEx</CardTitle>
          <CardDescription>Search for a package using regular expression over package names and READMEs</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              e.stopPropagation()
              void form.handleSubmit()
            }}
            className="max-w-xl w-full"
          >
            <form.Field
              name="RegEx"
              children={(field) => (
                <>
                  <Label htmlFor={field.name}> Package Name</Label>
                  <Input
                    id={field.name}
                    name={field.name}
                    placeholder="Enter RegEx Pattern"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                  />
                </>
              )}
            />
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit} className="mt-4">
                  {isSubmitting ? '...' : 'Update'}
                </Button>
              )}
            />
          </form>
          <Toaster /> {/* Add the toaster component */}
        </CardContent>
      </Card>
      <div className="mt-4 w-[500px]">
        {result.length > 0 ? (
          <ul>
            {result.map((pkg, index) => (
              <li key={index} className="border-b py-2">
                <strong>Name:</strong> {pkg.Name} <br />
                <strong>Version:</strong> {pkg.Version} <br />
                <strong>ID:</strong> {pkg.ID}
              </li>
            ))}
          </ul>
        ) : (
          <p>No packages found.</p>
        )}
      </div>
    </div>
  )
}