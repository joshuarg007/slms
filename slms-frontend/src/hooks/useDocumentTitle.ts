import { useEffect } from "react";

const BASE_TITLE = "Site2CRM";

/**
 * Custom hook to set the document title
 * @param title - The page-specific title (will be appended with base title)
 * @param includeBase - Whether to include the base title (default: true)
 */
export function useDocumentTitle(title?: string, includeBase = true) {
  useEffect(() => {
    const prevTitle = document.title;

    if (title) {
      document.title = includeBase ? `${title} | ${BASE_TITLE}` : title;
    } else {
      document.title = BASE_TITLE;
    }

    return () => {
      document.title = prevTitle;
    };
  }, [title, includeBase]);
}

export default useDocumentTitle;
