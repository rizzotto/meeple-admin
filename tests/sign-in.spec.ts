import { expect, test } from "@playwright/test";
for (const trigger of ["click", "enter", "google"] as const) {
  test(`submits ${trigger} sign-in through Convex and displays failures`, async ({
    page,
  }) => {
    const requests: { provider: string; params: Record<string, string> }[] = [];
    await page.routeWebSocket(/\.convex\.cloud\//, (socket) => {
      socket.onMessage((raw) => {
        const message = JSON.parse(String(raw));
        if (message.type !== "Action" || message.udfPath !== "auth:signIn")
          return;
        requests.push(message.args[0]);
        socket.send(
          JSON.stringify({
            type: "ActionResponse",
            requestId: message.requestId,
            success: false,
            result: "Simulated sign-in failure",
            logLines: [],
          }),
        );
      });
    });
    await page.goto("/");
    if (trigger === "google") {
      await page
        .getByRole("button", { name: "Continue with Google", exact: true })
        .click();
    } else {
      await page
        .getByLabel("Email", { exact: true })
        .fill("admin@example.test");
      await page
        .getByLabel("Password", { exact: true })
        .fill("test-password-only");
      if (trigger === "enter")
        await page.getByLabel("Password", { exact: true }).press("Enter");
      else
        await page
          .getByRole("button", { name: "Sign in", exact: true })
          .click();
    }
    await expect.poll(() => requests.length).toBe(1);
    if (trigger === "google") {
      expect(requests[0]).toMatchObject({
        provider: "google",
        params: { redirectTo: "http://127.0.0.1:5180/" },
      });
      await expect(page.getByRole("alert")).toContainText(
        "Google sign-in could not start",
      );
      await expect(
        page.getByRole("button", { name: "Continue with Google", exact: true }),
      ).toBeEnabled();
    } else {
      expect(requests[0]).toMatchObject({
        provider: "password",
        params: {
          email: "admin@example.test",
          password: "test-password-only",
          flow: "signIn",
        },
      });
      await expect(page.getByRole("alert")).toContainText("Unable to sign in");
      await expect(
        page.getByRole("button", { name: "Sign in", exact: true }),
      ).toBeEnabled();
    }
  });
}
