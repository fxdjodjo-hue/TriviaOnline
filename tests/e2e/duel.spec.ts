import { expect, test } from "@playwright/test";

test("creazione, ingresso, partita e rivincita", async ({ browser }) => {
  test.skip(!process.env.E2E_SUPABASE_READY, "Richiede Supabase locale migrato e seed.");
  const host=await browser.newPage(),guest=await browser.newPage();
  await host.goto("/");await host.getByLabel("Il tuo nickname").fill("Host");
  await host.getByRole("button",{name:"Crea una sfida"}).click();
  await expect(host).toHaveURL(/\/room\/[A-Z2-9]{6}/);
  const code=host.url().split("/").pop()!;
  await guest.goto("/");await guest.getByLabel("Il tuo nickname").fill("Guest");
  await guest.getByLabel("Codice stanza").fill(code);await guest.getByRole("button",{name:"Entra"}).click();
  await expect(host.getByText(/Domanda|Preparati/)).toBeVisible({timeout:10_000});
  await expect(guest.getByText(/Domanda|Preparati/)).toBeVisible({timeout:10_000});
  for(let i=0;i<7;i++){
    await host.locator(".answer").first().click();await guest.locator(".answer").first().click();
    await host.waitForTimeout(1200);
  }
  await expect(host.getByRole("button",{name:"Rivincita"})).toBeVisible({timeout:15_000});
  await host.getByRole("button",{name:"Rivincita"}).click();await guest.getByRole("button",{name:"Rivincita"}).click();
  await expect(host.getByText("Preparati!")).toBeVisible({timeout:5_000});
});
