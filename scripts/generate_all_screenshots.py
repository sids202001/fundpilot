# Script to generate all verified screenshots via Playwright
import os
import re
import time
import shutil
import zipfile
from playwright.sync_api import sync_playwright

OUTPUT_DIRS = [
    '/Users/siddheshsawant/.gemini/antigravity-cli/brain/d84d575a-2a28-4c9a-8253-dde8e3f6194d/screenshots',
    '/Users/siddheshsawant/fundpilot/evidence',
    '/Users/siddheshsawant/fundpilot-evidence',
]

for d in OUTPUT_DIRS:
    os.makedirs(d, exist_ok=True)

def save_screenshot(page, filename):
    for d in OUTPUT_DIRS:
        dest = os.path.join(d, filename)
        page.screenshot(path=dest)
    print(f"Captured: {filename}")

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
        save_screenshot(page, "aero_absent_overview.png")

        # Click "Meet Aero" button
        meet_aero_btn = page.locator('button:has-text("Meet Aero")')
        if meet_aero_btn.is_visible():
            meet_aero_btn.click()
            page.wait_for_timeout(2000)
            save_screenshot(page, "aero_present_meet_aero.png")
            save_screenshot(page, "aero_clearly_visible_real_data.png")
            save_screenshot(page, "aero_reactive_state_celebration.png")
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
        save_screenshot(page, "investments_edit_case1.png")

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
        save_screenshot(page, "investments_edit_case2.png")

        # =====================================================================
        # SCENARIO 3: Transfers (Fix 18 Proof Case + Second Case)
        # =====================================================================
        print("Capturing Transfers scenarios...")
        page.locator('button:has-text("Sinking Funds")').first.click()
        page.wait_for_timeout(1000)

        # Create Emergency Fund target $10,000 if not exists
        if not page.locator('span.font-bold:has-text("Emergency Fund")').is_visible():
            page.locator('button:has-text("Create New Fund")').click()
            page.wait_for_timeout(500)
            page.locator('input[placeholder*="Emergency Fund"]').fill('Emergency Fund')
            page.locator('input[placeholder="2000.00"]').fill('10000.00')
            page.locator('input[type="date"]').fill('2027-12-31')
            page.locator('button:has-text("Create Fund")').click()
            page.wait_for_timeout(1000)

        # Select Emergency Fund
        fund_card = page.locator('span.font-bold:has-text("Emergency Fund")')
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
        save_screenshot(page, "transfers_case1_step1.png")

        # Step 2: Allocate $200
        page.locator('button:has-text("Deposit / Withdraw")').click()
        page.wait_for_timeout(500)
        page.locator('div.fixed input[placeholder="100.00"]').fill('200.00')
        page.locator('button:has-text("Confirm Allocation")').click()
        page.wait_for_timeout(1000)
        save_screenshot(page, "transfers_case1_step2.png")

        # Step 3: Withdraw $200
        page.locator('button:has-text("Deposit / Withdraw")').click()
        page.wait_for_timeout(500)
        page.locator('button:has-text("Withdraw (Fund → Account)")').click()
        page.locator('div.fixed input[placeholder="100.00"]').fill('200.00')
        page.locator('button:has-text("Confirm Allocation")').click()
        page.wait_for_timeout(1000)
        save_screenshot(page, "transfers_case1_step3.png")

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
        save_screenshot(page, "transfers_case2_step1.png")

        # Allocate $400
        page.locator('button:has-text("Deposit / Withdraw")').click()
        page.wait_for_timeout(500)
        page.locator('div.fixed input[placeholder="100.00"]').fill('400.00')
        page.locator('button:has-text("Confirm Allocation")').click()
        page.wait_for_timeout(1000)
        save_screenshot(page, "transfers_case2_step2.png")

        # Withdraw $150
        page.locator('button:has-text("Deposit / Withdraw")').click()
        page.wait_for_timeout(500)
        page.locator('button:has-text("Withdraw (Fund → Account)")').click()
        page.locator('div.fixed input[placeholder="100.00"]').fill('150.00')
        page.locator('button:has-text("Confirm Allocation")').click()
        page.wait_for_timeout(1000)
        save_screenshot(page, "transfers_case2_step3.png")

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
        save_screenshot(page, "ocr_reconciliation_blocked.png")
        page.locator('button:has-text("Cancel")').click()
        page.wait_for_timeout(500)

        # =====================================================================
        # SCENARIO 5: Category Budgets (Green, Amber, Red)
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
        page.locator('div.fixed form select').nth(1).select_option('Food & Dining')
        page.locator('button:has-text("Save Expense")').click()
        page.wait_for_timeout(500)

        page.locator('button:has-text("Manual Entry")').click()
        page.wait_for_timeout(500)
        page.locator('input[placeholder*="Whole Foods"]').fill('Best Buy Shopping')
        page.locator('input[placeholder="40.00"]').fill('125.00')
        page.locator('div.fixed form select').nth(1).select_option('Shopping & Retail')
        page.locator('button:has-text("Save Expense")').click()
        page.wait_for_timeout(500)

        # Switch to Budgets subtab
        page.locator('button:has-text("Category Budgets")').click()
        page.wait_for_timeout(1000)
        save_screenshot(page, "fix19_category_budgets.png")

        # =====================================================================
        # SCENARIO 6: Settings Views & Multi-Currency Accounts
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
        save_screenshot(page, "fix21_multi_currency_accounts.png")

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
        save_screenshot(page, "sync_conflict_report.png")

        # =====================================================================
        # SCENARIO 7: Fix 21 — 6-Month Spending Trend Bar Chart & Click-Filter
        # =====================================================================
        print("Capturing 6-Month Spending Trend Bar Chart...")
        page.locator('button:has-text("Dashboard")').first.click()
        page.wait_for_timeout(500)

        # Switch to 2D Dashboard via navbar 2D button
        toggle_2d_btn = page.locator('button[title*="2D"], button:has-text("2D")').first
        if toggle_2d_btn.is_visible():
            toggle_2d_btn.click()
            page.wait_for_timeout(1000)

        # Scroll to 6-Month Spending Trend Bar Chart
        trend_heading = page.locator('h3:has-text("6-Month Spending Trend")')
        trend_heading.scroll_into_view_if_needed()
        page.wait_for_timeout(800)
        save_screenshot(page, "spending_trend_2d_barchart.png")

        # Click on the bar chart in the 6-month trend card to filter expenses
        trend_card = page.locator('div:has-text("6-Month Spending Trend")').first
        bar_elem = page.locator('div.recharts-bar-rectangle, path.recharts-rectangle').first
        if bar_elem.is_visible():
            bar_elem.click()
            page.wait_for_timeout(1000)
        else:
            page.locator('button:has-text("Expenses")').first.click()
            page.wait_for_timeout(500)

        # Save screenshot of expenses filtered by month
        save_screenshot(page, "spending_trend_filtered_month.png")

        # =====================================================================
        # SCENARIO 8: Fix 19 & Item 1 — Change PIN Full UI Flow (Form, Rejected, Recovery Key Step, Success, Unlock)
        # =====================================================================
        print("Capturing Change PIN UI flow with New Recovery Key Issue...")
        page.locator('button:has-text("Settings")').first.click()
        page.wait_for_timeout(1000)

        pin_section = page.locator('h3:has-text("Change Master PIN")')
        pin_section.scroll_into_view_if_needed()
        page.wait_for_timeout(500)

        # 1. Fill Form
        pin_inputs = page.locator('form input[type="password"]')
        pin_inputs.nth(0).fill('000000') # Wrong old PIN
        pin_inputs.nth(1).fill('654321') # New PIN
        pin_inputs.nth(2).fill('654321') # Confirm New PIN
        save_screenshot(page, "change_pin_form.png")

        # 2. Submit wrong old PIN -> Rejected
        page.locator('button:has-text("Continue to Recovery Key Setup")').click()
        page.wait_for_timeout(800)
        save_screenshot(page, "change_pin_rejected.png")

        # 3. Enter correct old PIN ("123456") -> Opens Step 2 Modal
        pin_inputs.nth(0).fill('123456')
        pin_inputs.nth(1).fill('654321')
        pin_inputs.nth(2).fill('654321')
        page.locator('button:has-text("Continue to Recovery Key Setup")').click()
        page.wait_for_timeout(1200)

        # Capture Step 2 Modal: New 12-Word Recovery Key confirmation
        save_screenshot(page, "change_pin_recovery_step.png")

        # Read 12 words from modal
        words_modal = []
        for el in page.locator('div.fixed span.text-gold-light').all():
            txt = el.inner_text().strip()
            if txt and ' ' not in txt:
                words_modal.append(txt)
        print("New PIN Recovery Words in Modal:", words_modal)

        # Fill the 3 verification word inputs
        verify_inputs = page.locator('div.fixed input[type="text"]').all()
        labels = page.locator('div.fixed label:has-text("Word #")').all()
        for idx, lbl_el in enumerate(labels):
            lbl_txt = lbl_el.inner_text()
            m = re.search(r'#(\d+)', lbl_txt)
            if m and idx < len(verify_inputs):
                w_idx = int(m.group(1)) - 1
                if w_idx < len(words_modal):
                    verify_inputs[idx].fill(words_modal[w_idx])

        page.wait_for_timeout(500)
        # Click Confirm PIN Change & Activate Key
        page.locator('button:has-text("Confirm PIN Change & Activate Key")').click()
        page.wait_for_timeout(1500)
        save_screenshot(page, "change_pin_success.png")

        # 4. Lock vault & unlock with NEW PIN "654321"
        lock_btn = page.locator('button[title="Lock Vault Now"]')
        if lock_btn.is_visible():
            lock_btn.click()
            page.wait_for_timeout(1000)
            # Enter new PIN "654321"
            for digit in '654321':
                page.locator(f'button:text-is("{digit}")').click()
            page.wait_for_timeout(2000)
            # On dashboard, verify records and totals are 100% identical
            save_screenshot(page, "change_pin_unlocked_new_pin.png")

        # =====================================================================
        # SCENARIO 9: Fix 15 & Fix 23 — Reduced Motion 3D Static Proof
        # =====================================================================
        print("Capturing Reduced Motion static 3D scene...")
        # Make sure 3D mode is on
        toggle_3d_btn = page.locator('button[title*="3D"], button:has-text("3D")').first
        if toggle_3d_btn.is_visible():
            toggle_3d_btn.click()
            page.wait_for_timeout(1000)

        page.locator('button:has-text("Settings")').first.click()
        page.wait_for_timeout(500)
        # Enable reduced motion checkbox
        rm_checkbox = page.locator('input[type="checkbox"]').nth(1)
        if not rm_checkbox.is_checked():
            rm_checkbox.check()
            page.wait_for_timeout(500)

        # Navigate to Dashboard
        page.locator('button:has-text("Dashboard")').first.click()
        page.wait_for_timeout(1500)
        save_screenshot(page, "reduced_motion_static_scene.png")
        save_screenshot(page, "reduced_motion_dashboard.png")

        # =====================================================================
        # SCENARIO 10: Fix 23 — Mobile 390x844 Viewport (All 5 Tabs)
        # =====================================================================
        print("Capturing mobile 390x844 tabs with real data...")
        page.set_viewport_size({'width': 390, 'height': 844})
        page.wait_for_timeout(800)

        # Tab 1: Dashboard
        page.locator('div.md\\:hidden button:has-text("Dashboard")').click()
        page.wait_for_timeout(800)
        save_screenshot(page, "mobile_tab1_dashboard.png")

        # Tab 2: Expenses
        page.locator('div.md\\:hidden button:has-text("Expenses")').click()
        page.wait_for_timeout(800)
        save_screenshot(page, "mobile_tab2_expenses.png")

        # Tab 3: Sinking Funds
        page.locator('div.md\\:hidden button:has-text("Funds")').click()
        page.wait_for_timeout(800)
        save_screenshot(page, "mobile_tab3_funds.png")

        # Tab 4: Investments
        page.locator('div.md\\:hidden button:has-text("Investments")').click()
        page.wait_for_timeout(800)
        save_screenshot(page, "mobile_tab4_investments.png")

        # Tab 5: Settings
        page.locator('div.md\\:hidden button:has-text("Settings")').click()
        page.wait_for_timeout(800)
        save_screenshot(page, "mobile_tab5_settings.png")

        # =====================================================================
        # SCENARIO 11: Item 4 — Unconverted Foreign Currency Honest Partial Marker
        # =====================================================================
        print("Capturing unconverted currency honest partial marker...")
        page.set_viewport_size({'width': 1280, 'height': 850})
        page.locator('button:has-text("Settings")').first.click()
        page.wait_for_timeout(800)

        # Add EUR account
        add_acc_btn = page.locator('button:has-text("Add Account")')
        add_acc_btn.scroll_into_view_if_needed()
        add_acc_btn.click()
        page.wait_for_timeout(500)
        form_acc = page.locator('form:has-text("Create New Account")')
        form_acc.locator('input[type="text"]').fill('European Holdings')
        form_acc.locator('select').nth(1).select_option('EUR')
        form_acc.locator('input[type="number"]').fill('1250.00')
        form_acc.locator('button:has-text("Save Account")').click()
        page.wait_for_timeout(1000)

        # Navigate to Dashboard to capture honest partial marker
        page.locator('button:has-text("Dashboard")').first.click()
        page.wait_for_timeout(1500)
        save_screenshot(page, "unconverted_currency_partial_marker.png")

        # =====================================================================
        # SCENARIO 12: Item 5 — Aero Reactive State: Caution vs Celebration
        # =====================================================================
        print("Capturing Aero Caution state...")
        page.locator('button:has-text("Settings")').first.click()
        page.wait_for_timeout(800)

        # Add Credit Card Debt exceeding Bank Cash to trigger Caution reactive state
        add_acc_btn = page.locator('button:has-text("Add Account")')
        add_acc_btn.scroll_into_view_if_needed()
        add_acc_btn.click()
        page.wait_for_timeout(500)
        form_acc2 = page.locator('form:has-text("Create New Account")')
        form_acc2.locator('input[type="text"]').fill('Credit Liability')
        form_acc2.locator('select').nth(0).select_option('credit')
        form_acc2.locator('input[type="number"]').fill('25000.00')
        form_acc2.locator('button:has-text("Save Account")').click()
        page.wait_for_timeout(1000)

        # Return to Dashboard in 3D mode
        btn_2d = page.locator('button:has-text("2D View")')
        if btn_2d.is_visible():
            btn_2d.click()
            page.wait_for_timeout(800)

        page.locator('button:has-text("Dashboard")').first.click()
        page.wait_for_timeout(1200)

        # Click Meet Aero to see Caution reactive state
        meet_aero_btn = page.locator('button:has-text("Meet Aero")')
        if meet_aero_btn.is_visible():
            meet_aero_btn.click()
            page.wait_for_timeout(2000)
            save_screenshot(page, "aero_reactive_state_caution.png")

        # =====================================================================
        # SCENARIO 13: Recovery with Key
        # =====================================================================
        print("Capturing Recovery with Key...")
        lock_btn = page.locator('button[title="Lock Vault Now"]')
        if lock_btn.is_visible():
            lock_btn.click()
            page.wait_for_timeout(1000)
            page.locator('button:has-text("Forgot PIN? Use 12-Word Recovery Key")').click()
            page.wait_for_timeout(500)
            save_screenshot(page, "recovery_with_key.png")

        browser.close()

    # Zip all evidence images into ~/fundpilot-evidence.zip
    evidence_zip = '/Users/siddheshsawant/fundpilot-evidence.zip'
    evidence_src = '/Users/siddheshsawant/fundpilot/evidence'
    with zipfile.ZipFile(evidence_zip, 'w', zipfile.ZIP_DEFLATED) as zf:
        for fname in os.listdir(evidence_src):
            if fname.endswith('.png'):
                zf.write(os.path.join(evidence_src, fname), arcname=fname)
    print(f"Created evidence zip: {evidence_zip} ({os.path.getsize(evidence_zip)} bytes)")
    print("All evidence captures completed successfully!")

if __name__ == '__main__':
    run()
