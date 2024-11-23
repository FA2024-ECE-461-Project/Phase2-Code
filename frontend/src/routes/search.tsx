import { createFileRoute } from "@tanstack/react-router";
import { Verified } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/search")({
  component: searchPackage,
});

function searchPackage() {
  // offset should be supplied by user clicking the next page button
  let offset = 0;   // default page 0

  // adopted from https://www.freecodecamp.org/news/how-to-build-forms-in-react/
  const [formData, setFormData] = useState({Name: "", Version: ""} ); //init form state to empty name and version

  // change: when user types in one of the form fields
  const handleChange = (event: any) => {
    // extracts the name and value from the event target that has changed
    const {name, value} = event.target;
    // update the form data with the new value
    setFormData({...formData, [name]: value});
  };

  const handleSubmit = (event: any) => {
    event.preventDefault();
    alert(`Name: ${formData.Name}, Email: ${formData.Version}}`
    );
};



  return (
    <><div className="p-2">
      <h3>Search packages here by filling out the form below.</h3>
    </div><form onSubmit={handleSubmit}>
        <label>
          Name:
          <input type="text" name="Name" onChange={handleChange} />
        </label>
        <label>
          Version:
          <input type="text" name="Version" onChange={handleChange} />
        </label>
        <button type="submit">Submit</button>
      </form></>
  );
}

