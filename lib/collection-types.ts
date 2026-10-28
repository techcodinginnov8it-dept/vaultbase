export const collectionTypeOptions = [
  { value: "general", label: "General", description: "A flexible workspace" },
  { value: "work", label: "Work", description: "Work and professional items" },
  { value: "personal", label: "Personal", description: "Personal information" },
  { value: "finance", label: "Finance", description: "Money and financial records" },
  { value: "projects", label: "Projects", description: "Project planning and delivery" },
  { value: "bookmarks", label: "Bookmarks", description: "Saved links and references" },
  { value: "reading", label: "Reading", description: "Books, articles, and research" },
  { value: "media", label: "Media", description: "Images, videos, and media" },
  { value: "travel", label: "Travel", description: "Trips and travel plans" },
  { value: "learning", label: "Learning", description: "Courses and study notes" },
  { value: "health", label: "Health", description: "Health and wellness records" },
  { value: "shopping", label: "Shopping", description: "Shopping and purchases" },
] as const;

export const predefinedCollectionTypes = collectionTypeOptions.map((option) => option.value);
