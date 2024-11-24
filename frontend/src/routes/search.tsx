import { createFileRoute } from "@tanstack/react-router";
import { Verified } from "lucide-react";
import { useState } from "react";
import { api } from "../lib/api";
import { string } from "zod";

export const Route = createFileRoute("/search")({
  component: searchPackage,
});

function searchPackage() {
  // offset should be supplied by user clicking the next page button
  let offset = 0; // default page 0

  // adopted from https://www.freecodecamp.org/news/how-to-build-forms-in-react/
  const [formData, setFormData] = useState({ Name: "", Version: "" }); //init form state to empty name and version

  // change: when user types in one of the form fields
  const handleChange = (event: any) => {
    // extracts the name and value from the event target that has changed
    const { name, value } = event.target;
    // update the form data with the new value
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const reqBody = {
      Name: formData.Name,
      Version: formData.Version,
    };

    try {
      // Await the promise to be resolved
      const packages = await api.packages.$post({ json: reqBody }); 
      // Display the returned data using alert
      alert(JSON.stringify(packages)); 
    } catch (error) {
      console.error("Error fetching packages:", error);
      alert("An error occurred while fetching packages.");
    }
  };

  return (
    <>
      <div className="p-2">
        <h3>Search packages here.</h3>
      </div>
      <form onSubmit={handleSubmit}>
        <label>
          Name:
          <input
            type="text"
            name="Name"
            onChange={handleChange}
            style={{ color: "black" }}
          />
        </label>
        <label>
          Version:
          <input
            type="text"
            name="Version"
            onChange={handleChange}
            style={{ color: "black" }}
          />
        </label>
        <button type="submit" style={{ marginTop: "10px" }}>Submit</button>
      </form>
    </>
  );
}
