
from playwright.sync_api import Page, expect, sync_playwright
import time

def verify_tooltip(page: Page):
    print("Navigating to page...")
    page.goto("http://localhost:3000/test-palette")

    print("Waiting for load...")
    time.sleep(2)

    print("Looking for button...")
    button = page.get_by_label("Прикрепить файл")
    expect(button).to_be_visible()

    print("Hovering and Focusing...")
    button.hover()
    button.focus()

    # Wait a bit for tooltip animation
    time.sleep(2)

    print("Taking screenshot...")
    page.screenshot(path="verification/verification.png")

    print("Checking for tooltip role...")
    # Radix tooltip content usually has role="tooltip" if configured, but let's check generic locator
    count = page.get_by_text("Прикрепить").count()
    print(f"Found {count} elements with text 'Прикрепить'")

    # Try to find the exact text
    try:
        expect(page.get_by_text("прикрепить файл").or_(page.get_by_text("Прикрепить файл")).or_(page.get_by_text("Прикрепить Файл"))).to_be_visible()
        print("Text verification successful!")
    except Exception as e:
        print(f"Text verification failed: {e}")
        # If text fails, we still have the screenshot to look at manually if it appeared.

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_tooltip(page)
        except Exception as e:
            print(f"Script error: {e}")
        finally:
            browser.close()
