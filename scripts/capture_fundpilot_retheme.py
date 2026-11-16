import asyncio
import os
import shutil
from playwright.async_api import async_playwright

ARTIFACT_DIR = os.environ.get("ARTIFACT_DIR", "/tmp/fundpilot_screenshots")

def log(msg):
    print(msg, flush=True)

async def main():
    os.makedirs(ARTIFACT_DIR, exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={"width": 1440, "height": 900})
        page = await context.new_page()

        # Handle all browser dialogs (alert, confirm, prompt) automatically
        async def handle_dialog(dialog):
            log(f"Dialog opened: {dialog.message}")
            await dialog.accept()
        page.on("dialog", lambda d: asyncio.create_task(handle_dialog(d)))

        log("Navigating to http://localhost:3000...")
        await page.goto("http://localhost:3000", wait_until="networkidle")
        await asyncio.sleep(2)

        # Check if setup or unlock screen is visible
        setup_h1 = page.locator('h1:has-text("Create Master PIN")')
        unlock_h1 = page.locator('h1:has-text("Unlock FundPilot Vault")')
        confirm_h1 = page.locator('h1:has-text("Confirm Your Master PIN")')

        if await setup_h1.is_visible():
            log("Setting up initial PIN...")
            # Click 1,2,3,4,5,6
            for d in ['1','2','3','4','5','6']:
                await page.locator(f'button:text-is("{d}")').click()
                await asyncio.sleep(0.1)
            await asyncio.sleep(0.5)

            # Confirm PIN
            for d in ['1','2','3','4','5','6']:
                await page.locator(f'button:text-is("{d}")').click()
                await asyncio.sleep(0.1)
            await asyncio.sleep(0.5)

            btn = page.locator('button:has-text("Confirm & Initialize Vault")')
            if await btn.is_visible():
                await btn.click()
            await asyncio.sleep(2)
        elif await unlock_h1.is_visible():
            log("Unlocking with PIN...")
            for d in ['1','2','3','4','5','6']:
                await page.locator(f'button:text-is("{d}")').click()
                await asyncio.sleep(0.1)
            await asyncio.sleep(2)

        # Now on the dashboard or main app
        log("Vault ready. Populating rich showcase data...")

        # 1. Populate Portfolio
        portfolio_tab = page.locator('nav button:has-text("Portfolio")').first
        if await portfolio_tab.is_visible():
            await portfolio_tab.click()
            await asyncio.sleep(1)

            # Run XYZ 8:1 Drill if button is present
            xyz_drill = page.locator('button:has-text("Run XYZ 8:1 Drill")').first
            if await xyz_drill.is_visible():
                await xyz_drill.click()
                await asyncio.sleep(1)

            # Add holding NVDA if needed
            add_h = page.locator('button:has-text("Add Holding")').first
            if await add_h.is_visible():
                await add_h.click()
                await asyncio.sleep(0.5)
                await page.locator('input[placeholder*="NVDA"]').fill("NVDA")
                await page.locator('input[placeholder="1.0"]').fill("25")
                await page.locator('input[placeholder="145.00"]').fill("142.50")
                await page.locator('form button[type="submit"]').click()
                await asyncio.sleep(1)

            # Add holding AAPL
            if await add_h.is_visible():
                await add_h.click()
                await asyncio.sleep(0.5)
                await page.locator('input[placeholder*="NVDA"]').fill("AAPL")
                await page.locator('input[placeholder="1.0"]').fill("15")
                await page.locator('input[placeholder="145.00"]').fill("225.00")
                await page.locator('form button[type="submit"]').click()
                await asyncio.sleep(1)

        # 2. Populate Expenses
        expenses_tab = page.locator('nav button:has-text("Expenses")').first
        if await expenses_tab.is_visible():
            await expenses_tab.click()
            await asyncio.sleep(1)

            manual_btn = page.locator('button:has-text("Manual Entry")').first
            # Add Groceries
            if await manual_btn.is_visible():
                await manual_btn.click()
                await asyncio.sleep(0.5)
                await page.locator('input[placeholder*="Whole Foods"]').fill("Whole Foods Market")
                await page.locator('input[placeholder="40.00"]').fill("112.45")
                await page.locator('form button[type="submit"]:has-text("Save Expense")').click()
                await asyncio.sleep(0.8)

            # Add Dining
            if await manual_btn.is_visible():
                await manual_btn.click()
                await asyncio.sleep(0.5)
                await page.locator('input[placeholder*="Whole Foods"]').fill("Blue Bottle Coffee")
                await page.locator('input[placeholder="40.00"]').fill("18.50")
                await page.locator('form button[type="submit"]:has-text("Save Expense")').click()
                await asyncio.sleep(0.8)

            # Add Utilities
            if await manual_btn.is_visible():
                await manual_btn.click()
                await asyncio.sleep(0.5)
                await page.locator('input[placeholder*="Whole Foods"]').fill("ConEd Electric")
                await page.locator('input[placeholder="40.00"]').fill("145.20")
                await page.locator('form button[type="submit"]:has-text("Save Expense")').click()
                await asyncio.sleep(0.8)

        # 3. Populate Sinking Funds
        funds_tab = page.locator('nav button:has-text("Sinking Funds")').first
        if await funds_tab.is_visible():
            await funds_tab.click()
            await asyncio.sleep(1)

            create_fund = page.locator('button:has-text("Create New Fund")').first
            if await create_fund.is_visible():
                await create_fund.click()
                await asyncio.sleep(0.5)
                await page.locator('input[placeholder*="Emergency"]').fill("Emergency Reserve")
                await page.locator('input[placeholder="2000.00"]').fill("5000.00")
                await page.locator('form input[type="date"]').fill("2027-12-31")
                await page.locator('form button[type="submit"]:has-text("Create Fund")').click()
                await asyncio.sleep(1)

                # Allocate
                dep_btn = page.locator('button:has-text("Deposit / Withdraw")').first
                if await dep_btn.is_visible():
                    await dep_btn.click()
                    await asyncio.sleep(0.5)
                    await page.locator('input[placeholder="100.00"]').fill("2500.00")
                    await page.locator('form button[type="submit"]:has-text("Confirm Allocation")').click()
                    await asyncio.sleep(1)

            if await create_fund.is_visible():
                await create_fund.click()
                await asyncio.sleep(0.5)
                await page.locator('input[placeholder*="Emergency"]').fill("Alpine Ski Vacation")
                await page.locator('input[placeholder="2000.00"]').fill("2000.00")
                await page.locator('form input[type="date"]').fill("2027-06-30")
                await page.locator('form button[type="submit"]:has-text("Create Fund")').click()
                await asyncio.sleep(1)

                dep_btn = page.locator('button:has-text("Deposit / Withdraw")').first
                if await dep_btn.is_visible():
                    await dep_btn.click()
                    await asyncio.sleep(0.5)
                    await page.locator('input[placeholder="100.00"]').fill("950.00")
                    await page.locator('form button[type="submit"]:has-text("Confirm Allocation")').click()
                    await asyncio.sleep(1)

        # 4. Return to Dashboard for 3D Previews
        dashboard_tab = page.locator('nav button:has-text("Dashboard")').first
        await dashboard_tab.click()
        await asyncio.sleep(3)

        log("Capturing 3D Overview...")
        await page.screenshot(path="preview_dashboard_overview.png")
        shutil.copy("preview_dashboard_overview.png", os.path.join(ARTIFACT_DIR, "preview_dashboard_overview.png"))

        # Camera views inside 3D canvas overlay
        exp_cam = page.locator('button:has-text("Expense Skyline")').first
        funds_cam = page.locator('button:has-text("Sinking Orbits")').first
        port_cam = page.locator('button:has-text("Portfolio Treemap")').first
        mascot_cam = page.locator('button:has-text("Meet Aero")').first

        if await exp_cam.is_visible():
            log("Capturing 3D Expenses...")
            await exp_cam.click()
            await asyncio.sleep(2)
            await page.screenshot(path="preview_3d_expenses.png")
            shutil.copy("preview_3d_expenses.png", os.path.join(ARTIFACT_DIR, "preview_3d_expenses.png"))

        if await funds_cam.is_visible():
            log("Capturing 3D Funds...")
            await funds_cam.click()
            await asyncio.sleep(2)
            await page.screenshot(path="preview_3d_funds.png")
            shutil.copy("preview_3d_funds.png", os.path.join(ARTIFACT_DIR, "preview_3d_funds.png"))

        if await port_cam.is_visible():
            log("Capturing 3D Portfolio...")
            await port_cam.click()
            await asyncio.sleep(2)
            await page.screenshot(path="preview_3d_portfolio.png")
            shutil.copy("preview_3d_portfolio.png", os.path.join(ARTIFACT_DIR, "preview_3d_portfolio.png"))

        if await mascot_cam.is_visible():
            log("Capturing Aero Mascot Drone Close-up...")
            await mascot_cam.click()
            await asyncio.sleep(2.5)
            await page.screenshot(path="preview_mascot_aero_drone.png")
            shutil.copy("preview_mascot_aero_drone.png", os.path.join(ARTIFACT_DIR, "preview_mascot_aero_drone.png"))

        # 2D Mode Fallback
        toggle_2d = page.locator('button:has-text("2D Mode")')
        if await toggle_2d.is_visible():
            log("Toggling 2D Fallback Mode...")
            await toggle_2d.click()
            await asyncio.sleep(2)
            await page.screenshot(path="preview_dashboard_2d.png")
            shutil.copy("preview_dashboard_2d.png", os.path.join(ARTIFACT_DIR, "preview_dashboard_2d.png"))

            # Toggle back to 3D
            toggle_3d = page.locator('button:has-text("3D Mode")')
            if await toggle_3d.is_visible():
                await toggle_3d.click()
                await asyncio.sleep(1)

        # Capture Module Screens
        log("Capturing Module Screens...")
        await expenses_tab.click()
        await asyncio.sleep(1)
        await page.screenshot(path="preview_module_expenses.png")
        shutil.copy("preview_module_expenses.png", os.path.join(ARTIFACT_DIR, "preview_module_expenses.png"))

        await funds_tab.click()
        await asyncio.sleep(1)
        await page.screenshot(path="preview_module_funds.png")
        shutil.copy("preview_module_funds.png", os.path.join(ARTIFACT_DIR, "preview_module_funds.png"))

        await portfolio_tab.click()
        await asyncio.sleep(1)
        await page.screenshot(path="preview_module_portfolio.png")
        shutil.copy("preview_module_portfolio.png", os.path.join(ARTIFACT_DIR, "preview_module_portfolio.png"))

        # Mobile Viewport
        log("Capturing Mobile Responsive View (390x844)...")
        await page.set_viewport_size({"width": 390, "height": 844})
        dashboard_mobile = page.locator('button:has-text("Dashboard")').first
        await dashboard_mobile.click()
        await asyncio.sleep(2)
        await page.screenshot(path="preview_mobile_dashboard.png")
        shutil.copy("preview_mobile_dashboard.png", os.path.join(ARTIFACT_DIR, "preview_mobile_dashboard.png"))

        await browser.close()
        log("All previews captured successfully!")

if __name__ == "__main__":
    asyncio.run(main())
