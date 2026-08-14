/**
 * @module lib/appSettings
 * @overview Application settings loader and constants (e.g., app title configuration).
 * @responsibilities
 *   - Fetch cached application title from database settings
 * @exports
 *   - `DEFAULT_APP_TITLE`: Default application title string
 *   - `APP_TITLE_KEY`: DB setting key for app title
 *   - `APP_TITLE_MAX_LENGTH`: Maximum character length for app title
 *   - `getAppTitle`: Cached function to fetch current app title
 */
import { cache } from "react"
import { db } from "@/lib/db"

export const DEFAULT_APP_TITLE = "Piwulangan"
export const APP_TITLE_KEY = "appTitle"
export const APP_TITLE_MAX_LENGTH = 40

export const getAppTitle = cache(async (): Promise<string> => {
  const setting = await db.appSetting.findUnique({
    where: { key: APP_TITLE_KEY },
  })
  return setting?.value || DEFAULT_APP_TITLE
})
