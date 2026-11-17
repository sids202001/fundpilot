# Script to generate all verified screenshots via Playwright
import os
import re
import time
from playwright.sync_api import sync_playwright

OUTPUT_DIR = '/Users/siddheshsawant/.gemini/antigravity-cli/brain/d84d575a-2a28-4c9a-8253-dde8e3f6194d/screenshots'
os.makedirs(OUTPUT_DIR, exist_ok=True)

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(viewport={'width': 1280, 'height': 850})
        page = context.new_page()

        print("Navigating to http://localhost:3456...")
        page.goto('http://localhost:3456')
        page.wait_for_timeout(1000)

        # 1. Complete Setup / Unlock
        body = page.locator('body').inner_text()
        if 'Create Master PIN' in body:
            print("Performing initial vault setup...")
            for digit in '123456':
                page.locator(f'button:text-is("{digit}")').click()
            page.wait_for_timeout(150)
            for digit in '123456':
                page.locator(f'button:text-is("{digit}")').click()
            page.wait_for_timeout(150)
            page.locator('button:has-text("Next: Generate Recovery Key")').click()
            page.wait_for_timeout(500)

            words = []
            for el in page.locator('span.text-gold-light').all():
                txt = el.inner_text().strip()
                if txt and ' ' not in txt:
                    words.append(txt)
            print("Words:", words)

            page.locator('button:has-text("I Have Saved the Words")').click()
            page.wait_for_timeout(500)

            labels = page.locator('label:has-text("Enter Word #")').all()
            for lbl_el in labels:
                lbl = lbl_el.inner_text()
                m = re.search(r'#(\d+)', lbl)
                if m:
                    idx = int(m.group(1)) - 1
                    inp = lbl_el.locator('xpath=..').locator('input')
                    inp.fill(words[idx])

            page.locator('button:has-text("Initialize Vault")').click()
            page.wait_for_timeout(3000)
        elif 'Unlock FundPilot Vault' in body:
            print("Unlocking existing vault...")
            for digit in '123456':
                page.locator(f'button:text-is("{digit}")').click()
            page.wait_for_timeout(3000)

        print("Vault is unlocked.")
        page.wait_for_timeout(1000)

        # =====================================================================
        # SCENARIO 1: Aero in Meet Aero only (vs Overview)
        # =====================================================================
        print("Capturing Aero scenarios...")
        page.locator('button:has-text("Dashboard")').first.click()
        page.wait_for_timeout(1500)
        page.screenshot(path=f"{OUTPUT_DIR}/aero_absent_overview.png")

        # Click "Meet Aero" button
        meet_aero_btn = page.locator('button:has-text("Meet Aero")')
        if meet_aero_btn.is_visible():
            meet_aero_btn.click()
            page.wait_for_timeout(1500)
            page.screenshot(path=f"{OUTPUT_DIR}/aero_present_meet_aero.png")
            # Switch back to Overview
            page.locator('button:has-text("Overview")').click()
            page.wait_for_timeout(1000)

        # =====================================================================
        # SCENARIO 2: Investments CRUD (Case 1: $100 -> $120; Case 2: $50 -> $80)
        # =====================================================================
        print("Capturing Investments scenarios...")
        page.locator('button:has-text("Investments")').first.click()
        page.wait_for_timeout(1000)

        # Add Stocks entry $100
        page.locator('button:has-text("Add Investment")').click()
        page.wait_for_timeout(500)
        page.locator('div.fixed input[type="text"]').fill('Stocks')
        page.locator('div.fixed select').first.select_option('Stocks')
        page.locator('div.fixed input[type="number"]').fill('100.00')
        page.locator('button:has-text("Save Entry")').click()
        page.wait_for_timeout(1000)

        # Edit Stocks entry to $120.00
        edit_btn = page.locator('button[title="Edit Amount"]').first
        edit_btn.click()
        page.wait_for_timeout(500)
        page.locator('div.fixed input[type="number"]').fill('120.00')
        page.locator('button:has-text("Update Amount")').click()
        page.wait_for_timeout(1000)
        page.screenshot(path=f"{OUTPUT_DIR}/investments_edit_case1.png")

        # Case 2: Add Crypto $50 -> edit to $80
        page.locator('button:has-text("Add Investment")').click()
        page.wait_for_timeout(500)
        page.locator('div.fixed select').first.select_option('Crypto')
        page.locator('div.fixed input[type="text"]').fill('Cold Storage')
        page.locator('div.fixed input[type="number"]').fill('50.00')
        page.locator('button:has-text("Save Entry")').click()
        page.wait_for_timeout(1000)

        # Edit to $80.00
        edit_btn2 = page.locator('button[title="Edit Amount"]').first
        edit_btn2.click()
        page.wait_for_timeout(500)
        page.locator('div.fixed input[type="number"]').fill('80.00')
        page.locator('button:has-text("Update Amount")').click()
        page.wait_for_timeout(1000)
        page.screenshot(path=f"{OUTPUT_DIR}/investments_edit_case2.png")

        # =====================================================================
        # SCENARIO 3: Transfers (Fix 18 Proof Case + Second Case)
        # =====================================================================
        print("Capturing Transfers scenarios...")
        page.locator('button:has-text("Sinking Funds")').first.click()
        page.wait_for_timeout(1000)

        # Create Emergency Fund target $10,000
        page.locator('button:has-text("Create New Fund")').click()
        page.wait_for_timeout(500)
        page.locator('input[placeholder*="Emergency Fund"]').fill('Emergency Fund')
        page.locator('input[placeholder="2000.00"]').fill('10000.00')
        page.locator('input[type="date"]').fill('2027-12-31')
        page.locator('button:has-text("Create Fund")').click()
        page.wait_for_timeout(1000)

        # Select the newly created fund
        fund_card = page.locator('div:has-text("Emergency Fund")').first
        if fund_card.is_visible():
            fund_card.click()
            page.wait_for_timeout(500)

        # Go to Dashboard & adjust bank cash to $1,000
        page.locator('button:has-text("Dashboard")').first.click()
        page.wait_for_timeout(500)
        edit_kpi = page.locator('button[title="Quick Adjust Inflows & Cash"]')
        edit_kpi.click()
        page.wait_for_timeout(500)
        page.locator('#bank-cash-input').fill('1000.00')
        page.locator('button:has-text("Save Vault Inflows")').click()
        page.wait_for_timeout(1000)

        # Go to Sinking Funds -> Step 1 Screenshot (Cash $1,000, Fund $0)
        page.locator('button:has-text("Sinking Funds")').first.click()
        page.wait_for_timeout(1000)
        page.screenshot(path=f"{OUTPUT_DIR}/transfers_case1_step1.png")

        # Step 2: Allocate $200
        page.locator('button:has-text("Deposit / Withdraw")').click()
        page.wait_for_timeout(500)
        page.locator('div.fixed input[placeholder="100.00"]').fill('200.00')
        page.locator('button:has-text("Confirm Allocation")').click()
        page.wait_for_timeout(1000)
        page.screenshot(path=f"{OUTPUT_DIR}/transfers_case1_step2.png")

        # Step 3: Withdraw $200
        page.locator('button:has-text("Deposit / Withdraw")').click()
        page.wait_for_timeout(500)
        page.locator('button:has-text("Withdraw (Fund → Account)")').click()
        page.locator('div.fixed input[placeholder="100.00"]').fill('200.00')
        page.locator('button:has-text("Confirm Allocation")').click()
        page.wait_for_timeout(1000)
        page.screenshot(path=f"{OUTPUT_DIR}/transfers_case1_step3.png")

        # Case 2: Cash $2,500 + Fund $500 -> allocate $400 -> withdraw $150
        page.locator('button:has-text("Dashboard")').first.click()
        page.wait_for_timeout(500)
        edit_kpi.click()
        page.wait_for_timeout(500)
        page.locator('#bank-cash-input').fill('2500.00')
        page.locator('button:has-text("Save Vault Inflows")').click()
        page.wait_for_timeout(500)

        page.locator('button:has-text("Sinking Funds")').first.click()
        page.wait_for_timeout(500)
        page.locator('button:has-text("Deposit / Withdraw")').click()
        page.wait_for_timeout(500)
        page.locator('div.fixed input[placeholder="100.00"]').fill('500.00')
        page.locator('button:has-text("Confirm Allocation")').click()
        page.wait_for_timeout(1000)
        page.screenshot(path=f"{OUTPUT_DIR}/transfers_case2_step1.png")

        # Allocate $400
        page.locator('button:has-text("Deposit / Withdraw")').click()
        page.wait_for_timeout(500)
        page.locator('div.fixed input[placeholder="100.00"]').fill('400.00')
        page.locator('button:has-text("Confirm Allocation")').click()
        page.wait_for_timeout(1000)
        page.screenshot(path=f"{OUTPUT_DIR}/transfers_case2_step2.png")

        # Withdraw $150
        page.locator('button:has-text("Deposit / Withdraw")').click()
        page.wait_for_timeout(500)
        page.locator('button:has-text("Withdraw (Fund → Account)")').click()
        page.locator('div.fixed input[placeholder="100.00"]').fill('150.00')
        page.locator('button:has-text("Confirm Allocation")').click()
        page.wait_for_timeout(1000)
        page.screenshot(path=f"{OUTPUT_DIR}/transfers_case2_step3.png")

        # =====================================================================
        # SCENARIO 4: OCR Reconciliation Gate (Mismatched Receipt)
        # =====================================================================
        print("Capturing OCR reconciliation gate...")
        page.locator('button:has-text("Expenses")').first.click()
        page.wait_for_timeout(1000)

        page.locator('button:has-text("Receipt Scan")').click()
        page.wait_for_timeout(500)

        mismatched_text = """SHOPPER DELI
Sandwich $10.00
Soda $2.00
Subtotal: $12.00
Tax: $1.00
Grand Total: $15.00"""

        page.locator('textarea').fill(mismatched_text)
        page.locator('button:has-text("Parse Text")').click()
        page.wait_for_timeout(1000)
        page.screenshot(path=f"{OUTPUT_DIR}/ocr_reconciliation_blocked.png")
        page.locator('button:has-text("Cancel")').click()
        page.wait_for_timeout(500)

        # =====================================================================
        # SCENARIO 5: Category Budgets (Green, Amber, Red) (Fix 19)
        # =====================================================================
        print("Capturing Category Budgets...")
        page.locator('button:has-text("Manual Entry")').click()
        page.wait_for_timeout(500)
        page.locator('input[placeholder*="Whole Foods"]').fill('Whole Foods Groceries')
        page.locator('input[placeholder="40.00"]').fill('45.00')
        page.locator('button:has-text("Save Expense")').click()
        page.wait_for_timeout(500)

        page.locator('button:has-text("Manual Entry")').click()
        page.wait_for_timeout(500)
        page.locator('input[placeholder*="Whole Foods"]').fill('Chipotle Dining')
        page.locator('input[placeholder="40.00"]').fill('88.00')
        # Select Food & Dining category (2nd select in modal)
        page.locator('div.fixed form select').nth(1).select_option('Food & Dining')
        page.locator('button:has-text("Save Expense")').click()
        page.wait_for_timeout(500)

        page.locator('button:has-text("Manual Entry")').click()
        page.wait_for_timeout(500)
        page.locator('input[placeholder*="Whole Foods"]').fill('Best Buy Shopping')
        page.locator('input[placeholder="40.00"]').fill('125.00')
        # Select Shopping & Retail category (2nd select in modal)
        page.locator('div.fixed form select').nth(1).select_option('Shopping & Retail')
        page.locator('button:has-text("Save Expense")').click()
        page.wait_for_timeout(500)

        # Switch to Budgets subtab
        page.locator('button:has-text("Category Budgets")').click()
        page.wait_for_timeout(1000)
        page.screenshot(path=f"{OUTPUT_DIR}/fix19_category_budgets.png")

        # =====================================================================
        # SCENARIO 6: Settings Views (Storage Meter, Multi-Currency, Audit Log, Sync)
        # =====================================================================
        print("Capturing Settings views...")
        page.locator('button:has-text("Settings")').first.click()
        page.wait_for_timeout(1000)

        # Add an INR account to show multi-currency
        page.locator('button:has-text("Add Account")').click()
        page.wait_for_timeout(500)
        page.locator('input[placeholder*="HDFC Bank"]').fill('HDFC Savings Account')
        page.locator('form select').nth(1).select_option('INR')
        page.locator('form input[placeholder="0.00"]').fill('150000.00')
        page.locator('button:has-text("Save Account")').click()
        page.wait_for_timeout(1000)

        # Multi-currency accounts screenshot
        page.screenshot(path=f"{OUTPUT_DIR}/fix21_multi_currency_accounts.png")

        # Storage meter screenshot
        page.locator('h3:has-text("Dexie Local Storage Meter")').scroll_into_view_if_needed()
        page.wait_for_timeout(500)
        page.screenshot(path=f"{OUTPUT_DIR}/fix16_storage_meter.png")

        # Audit log screenshot
        page.locator('h3:has-text("Local Audit Log")').scroll_into_view_if_needed()
        page.wait_for_timeout(500)
        page.screenshot(path=f"{OUTPUT_DIR}/fix23_audit_log.png")

        # Export sync bundle then import to display conflict & merge audit report
        page.locator('button:has-text("Export Sync Bundle")').scroll_into_view_if_needed()
        try:
            with page.expect_download(timeout=5000) as download_info:
                page.locator('button:has-text("Export Sync Bundle")').click()
            download = download_info.value
            bundle_path = download.path()
            page.locator('input[type="file"][accept*="fundpilot-sync"]').set_input_files(bundle_path)
            page.wait_for_timeout(1000)
        except Exception as e:
            print("Sync bundle export/import note:", e)
        page.screenshot(path=f"{OUTPUT_DIR}/sync_conflict_report.png")

        # Reduced motion dashboard screenshot
        print("Capturing reduced motion / 2D view...")
        page.locator('button:has-text("Dashboard")').first.click()
        page.wait_for_timeout(500)
        # Prefer 2D toggle in navbar
        toggle_2d_btn = page.locator('button[title*="2D"], button:has-text("2D")').first
        if toggle_2d_btn.is_visible():
            toggle_2d_btn.click()
            page.wait_for_timeout(1000)
        page.screenshot(path=f"{OUTPUT_DIR}/reduced_motion_dashboard.png")

        # =====================================================================
        # SCENARIO 7: Mobile 390x844 Viewport (All 5 Tabs)
        # =====================================================================
        print("Capturing mobile 390x844 tabs...")
        page.set_viewport_size({'width': 390, 'height': 844})
        page.wait_for_timeout(500)

        # Tab 1: Dashboard
        page.locator('div.md\\:hidden button:has-text("Dashboard")').click()
        page.wait_for_timeout(800)
        page.screenshot(path=f"{OUTPUT_DIR}/mobile_tab1_dashboard.png")

        # Tab 2: Expenses
        page.locator('div.md\\:hidden button:has-text("Expenses")').click()
        page.wait_for_timeout(800)
        page.screenshot(path=f"{OUTPUT_DIR}/mobile_tab2_expenses.png")

        # Tab 3: Sinking Funds
        page.locator('div.md\\:hidden button:has-text("Funds")').click()
        page.wait_for_timeout(800)
        page.screenshot(path=f"{OUTPUT_DIR}/mobile_tab3_funds.png")

        # Tab 4: Investments
        page.locator('div.md\\:hidden button:has-text("Investments")').click()
        page.wait_for_timeout(800)
        page.screenshot(path=f"{OUTPUT_DIR}/mobile_tab4_investments.png")

        # Tab 5: Settings
        page.locator('div.md\\:hidden button:has-text("Settings")').click()
        page.wait_for_timeout(800)
        page.screenshot(path=f"{OUTPUT_DIR}/mobile_tab5_settings.png")

        # =====================================================================
        # SCENARIO 8: Recovery with Key
        # =====================================================================
        print("Capturing Recovery with Key...")
        page.set_viewport_size({'width': 1280, 'height': 850})
        # Click lock button in navbar
        lock_btn = page.locator('button[title="Lock Vault Now"]')
        if lock_btn.is_visible():
            lock_btn.click()
            page.wait_for_timeout(1000)
            page.locator('button:has-text("Forgot PIN? Use 12-Word Recovery Key")').click()
            page.wait_for_timeout(500)
            page.screenshot(path=f"{OUTPUT_DIR}/recovery_with_key.png")

        browser.close()
        print("All screenshots successfully captured in:", OUTPUT_DIR)

if __name__ == '__main__':
    run()
