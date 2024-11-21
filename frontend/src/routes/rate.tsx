import { createFileRoute } from '@tanstack/react-router';
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { useForm } from "@tanstack/react-form";
import { api } from "../lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { toast, Toaster } from "sonner";
import { useState } from 'react';

export const Route = createFileRoute('/rate')({
  component: ratePackage,
});

interface RateResponseSuccess {
  Rate: string | null;
}

interface RateResponseError {
  error: string;
}

function ratePackage() {
  const [packageRating, setPackageRating] = useState<string | null>(null);

  const form = useForm({
    defaultValues: {
      ID: "",
    },
    onSubmit: async ({ value }) => {
      const { ID } = value;
      // Send GET request to backend

      const res = await api.package[":ID"].rate.$get({
        param: { ID },
      });

      if (res.status === 200) {
        const data = (await res.json()) as RateResponseSuccess;
        setPackageRating(data.Rate); // Store the response data
        toast.success("Package rated successfully!");
      } else {
        const data = (await res.json()) as RateResponseError;
        toast.error(data.error || "An unexpected error occurred.");
      }
    },
  });

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <Card className="w-[500px]">
        <CardHeader>
          <CardTitle>Rate Package</CardTitle>
          <CardDescription>Enter the package ID to get its rating.</CardDescription>
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
                    placeholder="Enter Package ID"
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
                  {isSubmitting ? "..." : "Rate"}
                </Button>
              )}
            />
          </form>

          {packageRating !== null && (
            <div className="mt-4">
              <h2 className="text-xl font-semibold text-black">Package Rating:</h2>
              <p>{packageRating}</p>
            </div>
          )}

          <Toaster />
        </CardContent>
      </Card>
    </div>
  );
}
