import { createFileRoute } from "@tanstack/react-router";
import { Verified } from "lucide-react";
import { useState } from "react";
import { api } from "../lib/api";
import { string } from "zod";

export const Route = createFileRoute("/search")({
  component: searchPackage,
});

function searchPackage() {
  // adopted from https://www.freecodecamp.org/news/how-to-build-forms-in-react/
  const [formData, setFormData] = useState({ Name: "", Version: "" }); //init form state to empty name and version
  const [packages, setPackages] = useState([]);

  // change means when user types in one of the form fields
  const handleChange = (event: any) => {
    // extracts the name and value from the event target that has changed
    const { name, value } = event.target;
    // update the form data with the new value
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // open browser dev tool to see logs
    console.log("Form data submitted:", formData);
    const reqBody = {
      Name: formData.Name,
      Version: formData.Version,
    };

    try {
      // Await getting response from backend
      const response = await api.packages.$post({ json: reqBody });
      // API Spec: offset is in header of response
      const offset = response.headers.get("offset");
      if (!response.ok) {
        console.error("Error fetching packages:", response);
        throw new Error("An error occurred while fetching packages.");
      }
      // have to resolve response (a promise) to get the data
      const data = await response.json();
      console.log("Packages:", data);

      if (Array.isArray(data)) {
        setPackages(data);
      } else {
        setPackages([]);
      }

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
        <button type="submit" style={{ marginTop: "10px" }}>
          Submit
        </button>
      </form>
      {/* Display the fetched packages in a table */}
      {packages.length > 0 && (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Version</th>
            </tr>
          </thead>
          <tbody>
            {packages.map((pkg: any, index: number) => (
              <tr key={index}>
                <td>{pkg.Name}</td>
                <td>{pkg.Version}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
