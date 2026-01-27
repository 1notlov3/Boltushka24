from playwright.sync_api import Page, expect, sync_playwright
import time

def test_socket_indicator(page: Page):
    print("Navigating to /test-socket...")
    # 1. Arrange: Go to the test page.
    page.goto("http://localhost:3000/test-socket")

    # 2. Assert: Check if the SocketIndicator is visible.
    # It might be in "Connecting..." state (yellow) or "Online" (green).
    # Since we are not running the socket server (maybe?), it will likely be Connecting (yellow).

    # Wait for any badge to appear
    # We look for the badge by text "Подключение..." or "В сети"

    print("Waiting for indicator...")
    # Wait a bit to ensure hydration
    page.wait_for_timeout(2000)

    badge = page.locator("div").filter(has_text="Подключение...").first
    if not badge.is_visible():
         badge = page.locator("div").filter(has_text="В сети").first

    # Actually, let's use the class we added.
    # bg-yellow-600 for connecting

    connecting_badge = page.locator(".bg-yellow-600")
    online_badge = page.locator(".bg-emerald-600")

    if connecting_badge.count() > 0:
        print("Found Connecting Badge")
        expect(connecting_badge).to_be_visible()
        expect(connecting_badge).to_have_text("Подключение...")
    elif online_badge.count() > 0:
        print("Found Online Badge")
        expect(online_badge).to_be_visible()
        expect(online_badge).to_have_text("В сети")
    else:
        print("No badge found!")
        # Print body content to debug
        print(page.content())

    # 3. Screenshot
    page.screenshot(path="/home/jules/verification/socket-indicator.png")
    print("Screenshot saved.")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            test_socket_indicator(page)
        except Exception as e:
            print(f"Error: {e}")
        finally:
            browser.close()
