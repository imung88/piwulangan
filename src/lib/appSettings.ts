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
