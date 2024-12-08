import { createFileRoute } from '@tanstack/react-router'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Button } from '../components/ui/button'
import { useForm } from '@tanstack/react-form'
import { api } from '../lib/api'
import { useState } from 'react'
// import * as React from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import { toast, Toaster } from 'sonner'

export const Route = createFileRoute('/search')({
  component: searchPackage,
})

interface SearchPackageResponse {
  Name: string;
  Version?: string;
}

function searchPackage() {
  const [result, setResult] = useState<SearchPackageResponse[]>([]); // State to hold the returned package
  // const [error, setError] = useState(null) // State to hold error messages

  const form = useForm({
    defaultValues: {
      Name: "",
      Version: ""
    },
    onSubmit: async ({ value }) => {
      const { Name, Version } = value

      // Check if the ID is empty
      if (!Name) {
        toast.error('Name is required.')
        return
      }

      // Create payload object
      const payload = { Name, Version }

      // Send POST request to backend
      const res = await api.packages.$post({
        json: payload,
      })

      if (res.status === 200) {
        const data: SearchPackageResponse[] = await res.json(); // Parse the response body
        setResult(data); // Set the returned package data
        toast.success('Package Found!');
      } else if (res.status === 404) {
        toast.error('Package not found.');
      } else {
        toast.error('An unexpected error occurred. (i dont know why lol)');
      }
    },
  })

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <Card className="w-[500px]">
        <CardHeader>
          <CardTitle>Search Package</CardTitle>
          <CardDescription>Search Package by Name or Version</CardDescription>
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
              name="Name"
              children={(field) => (
                <>
                  <Label htmlFor={field.name}> Package Name</Label>
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
            <form.Field
              name="Version"
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
                </>
              )}
            />
            <form.Subscribe
              selector={(state) => [state.canSubmit, state.isSubmitting]}
              children={([canSubmit, isSubmitting]) => (
                <Button type="submit" disabled={!canSubmit} className="mt-4">
                  {isSubmitting ? '...' : 'Search'}
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
                <strong>Version:</strong> {pkg.Version}
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
