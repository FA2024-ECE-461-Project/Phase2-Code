import { createFileRoute } from "@tanstack/react-router";
import { Verified } from "lucide-react";

export const Route = createFileRoute("/search")({
  component: About,
  searchBody: searchBody,
});

function About() {
  return (
    <div className="p-2">
      <h3>This would be the page for /packages POST endpoint.</h3>
    </div>
  );
}

function Search() {
  return (
    <div className="p-2">
      <h3>This would be the page for /packages POST endpoint.</h3>
      {searchBody()}
    </div>
  );
}

function searchBody() {
  const [name, setName] = useState('');
  const [version, setVersion] = useState('');

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    // form submission logic: post request to the packages/ endpoint
    const reqBody = {Name: name, Version: version, offset: offset || null};
    
    console.log('Name:', name);
    console.log('Version:', version);
  };

  return (
    <form onSubmit={handleSubmit} className="p-2">
      <div className="mb-2">
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Package Name
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          required
        />
      </div>
      <div className="mb-2">
        <label htmlFor="version" className="block text-sm font-medium text-gray-700">
          Package Version
        </label>
        <input
          type="text"
          id="version"
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          required
        />
      </div>
      <button
        type="submit"
        className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        Search
      </button>
    </form>
  );
}

export default Search;