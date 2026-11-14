import asyncio
import os
import shutil
from playwright.async_api import async_playwright

ARTIFACT_DIR = "/Users/siddheshsawant/.gemini/antigravity-cli/brain/3c307a80-2bb9-4579-be27-19c81e59c5cc"

def log(msg):
    print(msg, flush=True)

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        async def handle_dialog(dialog):
            log(f"Dialog: {dialog.message}")
            await dialog.accept()
        page.on("dialog", handle_dialog)

        log("Navigating to http://localhost:3000...")
        await page.goto("http://localhost:3000", wait_until="networkidle")
        await asyncio.sleep(2)

        # 1. Setup initial PIN
        log("Entering master PIN 123456...")
        for d in ['1','2','3','4','5','6']:
            await page.locator(f'button:text-is("{d}")').click()
            await asyncio.sleep(0.08)
        await asyncio.sleep(0.5)

        log("Confirming master PIN 123456...")
        for d in ['1','2','3','4','5','6']:
            await page.locator(f'button:text-is("{d}")').click()
            await asyncio.sleep(0.08)
        await asyncio.sleep(0.5)

        await page.locator('button:has-text("Confirm & Initialize Vault")').click()
        await asyncio.sleep(2.5)

        # 2. Populate data using Portfolio XYZ Drill & Sinking Funds & Expenses
        log("Populating showcase portfolio holding...")
        port_tab = page.locator('header nav button:has-text("Portfolio")').first
        await port_tab.click()
        await asyncio.sleep(1)

        xyz_btn = page.locator('button:has-text("Run XYZ 8:1 Drill")').first
        if await xyz_btn.is_visible():
            await xyz_btn.click()
            await asyncio.sleep(1)

        # Add Sinking fund
        log("Populating sinking fund...")
        funds_tab = page.locator('header nav button:has-text("Sinking Funds")').first
        await funds_tab.click()
        await asyncio.sleep(1)

        cf_btn = page.locator('button:has-text("Create New Fund")').first
        if await cf_btn.is_visible():
            await cf_btn.click()
            await asyncio.sleep(0.5)
            await page.locator('input[placeholder*="Emergency"]').fill("Emergency Reserve")
            await page.locator('input[placeholder="2000.00"]').fill("5000.00")
            await page.locator('form input[type="date"]').fill("2027-12-31")
            await page.locator('form button[type="submit"]:has-text("Create Fund")').click()
            await asyncio.sleep(1)

            dep_btn = page.locator('button:has-text("Deposit / Withdraw")').first
            if await dep_btn.is_visible():
                await dep_btn.click()
                await asyncio.sleep(0.5)
                await page.locator('input[placeholder="100.00"]').fill("2000.00")
                await page.locator('form button[type="submit"]:has-text("Confirm Allocation")').click()
                await asyncio.sleep(1)

        # Go to Dashboard
        log("Navigating to Dashboard...")
        dash_btn = page.locator('header nav button:has-text("Dashboard")').first
        await dash_btn.click()
        await asyncio.sleep(2)

        # 3. Capture 2D Fallback Dashboard
        log("Toggling 2D Fallback View...")
        toggle_btn = page.locator('button:has-text("3D Scene"):visible').first
        await toggle_btn.click()
        await asyncio.sleep(2)
        await page.screenshot(path="preview_dashboard_2d.png")
        shutil.copy("preview_dashboard_2d.png", os.path.join(ARTIFACT_DIR, "preview_dashboard_2d.png"))
        log("preview_dashboard_2d.png saved!")

        # Toggle back to 3D
        toggle_back = page.locator('button:has-text("2D View"):visible').first
        await toggle_back.click()
        await asyncio.sleep(1.5)

        # 4. Capture Mobile Responsive View (390x844)
        log("Setting mobile viewport (390x844)...")
        await page.set_viewport_size({"width": 390, "height": 844})
        await asyncio.sleep(2)
        await page.screenshot(path="preview_mobile_dashboard.png")
        shutil.copy("preview_mobile_dashboard.png", os.path.join(ARTIFACT_DIR, "preview_mobile_dashboard.png"))
        log("preview_mobile_dashboard.png saved!")

        await browser.close()
        log("All remaining previews captured successfully!")

if __name__ == "__main__":
    asyncio.run(main())
