import { createFileRoute } from "@tanstack/react-router";
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
import { useState } from "react";
import { Separator } from "../components/ui/separator";

export const Route = createFileRoute("/rate")({
  component: ratePackage,
});

interface RateResponseSuccess {
  Rate: MetricsResult | null;
}

interface RateResponseError {
  error: string;
}

interface MetricsResult {
  URL: string;
  NetScore: number;
  NetScore_Latency: number;
  RampUp: number;
  RampUp_Latency: number;
  Correctness: number;
  Correctness_Latency: number;
  BusFactor: number;
  BusFactor_Latency: number;
  ResponsiveMaintainer: number;
  ResponsiveMaintainer_Latency: number;
  License: number;
  License_Latency: number;
  PR_Code_Reviews: number;
  PR_Code_Reviews_Latency: number;
  DependencyMetric: number;
  DependencyMetric_Latency: number;
}

function ratePackage() {
  const [packageRating, setPackageRating] = useState<MetricsResult | null>(
    null
  );

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
        const data = (await res.json()) as MetricsResult;
        setPackageRating(data); // Store the response data
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
          <CardDescription>
            Enter the package ID to get its rating.
          </CardDescription>
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
                  {isSubmitting ? "Rating..." : "Rate"}
                </Button>
              )}
            />
          </form>
          {packageRating !== null && (
            <>
              <Separator className="my-4" />
              <div className="flex flex-col space-y-2 text-sm">
                <div><strong>URL:</strong> {packageRating.URL}</div>
                <div><strong>NetScore:</strong> {packageRating.NetScore}</div>
                <div><strong>NetScore Latency:</strong> {packageRating.NetScore_Latency}</div>
                <div><strong>RampUp:</strong> {packageRating.RampUp}</div>
                <div><strong>RampUp Latency:</strong> {packageRating.RampUp_Latency}</div>
                <div><strong>Correctness:</strong> {packageRating.Correctness}</div>
                <div><strong>Correctness Latency:</strong> {packageRating.Correctness_Latency}</div>
                <div><strong>BusFactor:</strong> {packageRating.BusFactor}</div>
                <div><strong>BusFactor Latency:</strong> {packageRating.BusFactor_Latency}</div>
                <div><strong>ResponsiveMaintainer:</strong> {packageRating.ResponsiveMaintainer}</div>
                <div><strong>ResponsiveMaintainer Latency:</strong> {packageRating.ResponsiveMaintainer_Latency}</div>
                <div><strong>License:</strong> {packageRating.License}</div>
                <div><strong>License Latency:</strong> {packageRating.License_Latency}</div>
                <div><strong>PR Code Reviews:</strong> {packageRating.PR_Code_Reviews}</div>
                <div><strong>PR Code Reviews Latency:</strong> {packageRating.PR_Code_Reviews_Latency}</div>
                <div><strong>Dependency Metric:</strong> {packageRating.DependencyMetric}</div>
                <div><strong>Dependency Metric Latency:</strong> {packageRating.DependencyMetric_Latency}</div>
              </div>
            </>
          )}
          <Toaster />
        </CardContent>
      </Card>
    </div>
  );
}
