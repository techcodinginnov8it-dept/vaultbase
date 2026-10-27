"use client";

import { useState } from "react";

type CollectionTypeFieldProps = {
  initialType?: string;
};

const predefinedTypes = ["general", "work", "personal", "finance", "projects", "bookmarks"];

export function CollectionTypeField({ initialType = "general" }: CollectionTypeFieldProps) {
  const initialIsPredefined = predefinedTypes.includes(initialType);
  const [type, setType] = useState(initialIsPredefined ? initialType : "other");

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="collection-type" className="text-sm font-medium">Collection type</label>
      <select
        id="collection-type"
        name="collection_type"
        value={type}
        onChange={(event) => setType(event.target.value)}
        className="h-10 rounded-md border bg-background px-3 text-sm"
      >
        <option value="general">General</option>
        <option value="work">Work</option>
        <option value="personal">Personal</option>
        <option value="finance">Finance</option>
        <option value="projects">Projects</option>
        <option value="bookmarks">Bookmarks</option>
        <option value="other">Other</option>
      </select>
      {type === "other" ? (
          <input
          name="custom_collection_type"
          required
          maxLength={50}
            defaultValue={initialIsPredefined ? "" : initialType}
          placeholder="Type your collection type"
          className="h-10 rounded-md border bg-background px-3 text-sm"
          autoFocus
        />
      ) : null}
    </div>
  );
}
