import { expect, test } from "@playwright/test"

test("mobile navigation keeps primary sections visible and places the rest in More", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto("/")

  for (const label of ["Today", "Quiz", "Themes"]) {
    await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible()
  }
  await expect(page.getByRole("button", { name: "More navigation" })).toBeVisible()
  for (const label of ["Graph", "Notebook", "Progress", "Settings"]) {
    await expect(page.getByRole("button", { name: label, exact: true })).toHaveCount(0)
  }

  await page.getByRole("button", { name: "More navigation" }).click()
  for (const label of ["Graph", "Notebook", "Progress", "Settings"]) {
    await expect(page.getByRole("menuitem", { name: label })).toBeVisible()
  }
  await page.getByRole("menuitem", { name: "Notebook" }).click()
  await expect(page.getByText("Notebook", { exact: true }).first()).toBeVisible()

  await page.setViewportSize({ width: 1024, height: 768 })
  for (const label of ["Today", "Quiz", "Themes", "Graph", "Notebook", "Progress", "Settings"]) {
    await expect(page.getByRole("button", { name: label, exact: true })).toBeVisible()
  }
})

test("theme cards fill the mobile width and graph controls stay within the viewport", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto("/")
  await page.getByRole("button", { name: "Themes", exact: true }).click()

  const themeCard = page.getByRole("button", { name: /Greetings/ })
  await expect(themeCard).toBeVisible()
  const cardWidth = await themeCard.evaluate((card) => ({
    card: card.getBoundingClientRect().width,
    grid: card.parentElement?.getBoundingClientRect().width,
  }))
  expect(cardWidth.grid).toBeDefined()
  expect(cardWidth.card).toBeCloseTo(cardWidth.grid!, 0)

  await page.getByRole("button", { name: "More navigation" }).click()
  await page.getByRole("menuitem", { name: "Graph" }).click()
  for (const label of ["Explore mode", "Connect mode", "Add node mode", "Zoom in", "Zoom out", "Fit to view"]) {
    await expect(page.getByRole("button", { name: label })).toBeVisible()
  }
  await expect.poll(() =>
    page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
  ).toBe(true)
})

test("all app tabs remain usable without horizontal page overflow on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto("/")

  const assertNoHorizontalOverflow = async () => {
    await expect.poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
    ).toBe(true)
  }

  await assertNoHorizontalOverflow()
  await page.getByRole("button", { name: "Quiz", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Ready to train?" })).toBeVisible()
  await assertNoHorizontalOverflow()

  await page.getByRole("button", { name: "Themes", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Themed Pages" })).toBeVisible()
  await assertNoHorizontalOverflow()

  for (const [label, heading] of [
    ["Graph", "Explore"],
    ["Notebook", "Jump to Today"],
    ["Progress", "Your Progress"],
    ["Settings", "Pronunciation"],
  ] as const) {
    await page.getByRole("button", { name: "More navigation" }).click()
    await page.getByRole("menuitem", { name: label }).click()
    if (label === "Graph") {
      await expect(page.getByRole("button", { name: "Explore mode" })).toBeVisible()
    } else {
      await expect(page.getByText(heading, { exact: true }).first()).toBeVisible()
    }
    await assertNoHorizontalOverflow()
  }
})

test("sentence cards fill the available width on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto("/")

  const sentenceCards = page.locator('[role="button"][aria-label*=" - "]')
  await expect(sentenceCards.first()).toBeVisible()

  const firstCardWidths = await sentenceCards.first().evaluate((card) => ({
    card: card.getBoundingClientRect().width,
    grid: card.parentElement?.getBoundingClientRect().width,
  }))
  expect(firstCardWidths.grid).toBeDefined()
  expect(firstCardWidths.card).toBeCloseTo(firstCardWidths.grid!, 0)

  await expect.poll(() =>
    page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
  ).toBe(true)
})

test("Progress view renders its summaries and keeps the heatmap scrollable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 })
  await page.goto("/")

  await page.getByRole("button", { name: "More navigation" }).click()
  await page.getByRole("menuitem", { name: "Progress" }).click()

  await expect(page.getByRole("heading", { name: "Your Progress" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Last 365 Days" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Sentence Familiarity" })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Overview" })).toBeVisible()
  await expect(page.getByText("0 active days")).toBeVisible()

  const heatmap = page.locator(".scrollbar-thin")
  await expect(heatmap.locator('[title*="activities"]')).toHaveCount(365)
  await expect.poll(() =>
    heatmap.evaluate((element) => element.scrollWidth > element.clientWidth)
  ).toBe(true)
  await expect.poll(() =>
    page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)
  ).toBe(true)
})
