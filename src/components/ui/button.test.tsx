// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Button } from "./button";

afterEach(cleanup);

describe("Button loading", () => {
  it("shows a spinner and prevents clicking while explicitly loading", async () => {
    const onClick = vi.fn();
    const { rerender } = render(<Button loading onClick={onClick}>Сохранить</Button>);
    const button = screen.getByRole("button", { name: "Сохранить" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.querySelector('[data-slot="button-spinner"]')).toBeTruthy();
    await userEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
    rerender(<Button loading={false} onClick={onClick}>Сохранить</Button>);
    await userEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("keeps the accessible name for an icon-only loading button", () => {
    render(<Button loading size="icon" aria-label="Удалить"><svg /></Button>);
    const button = screen.getByRole("button", { name: "Удалить" });
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.querySelector('[data-slot="button-spinner"]')).toBeTruthy();
  });

  it("uses the actual form action status and also disables conflicting buttons", async () => {
    let resolve!: () => void;
    const action = vi.fn(() => new Promise<void>((done) => { resolve = done; }));
    render(<form action={action}><input aria-label="Название" /><Button type="submit">Создать</Button><Button type="button">Удалить</Button></form>);
    const submit = screen.getByRole("button", { name: "Создать" }) as HTMLButtonElement;
    const remove = screen.getByRole("button", { name: "Удалить" }) as HTMLButtonElement;
    await userEvent.click(submit);
    await waitFor(() => expect(submit.getAttribute("aria-busy")).toBe("true"));
    expect(submit.disabled).toBe(true);
    expect(remove.disabled).toBe(true);
    expect(remove.querySelector('[data-slot="button-spinner"]')).toBeNull();
    await userEvent.click(submit);
    expect(action).toHaveBeenCalledOnce();
    await act(async () => { resolve(); });
    expect(submit.disabled).toBe(false);
    expect(remove.disabled).toBe(false);
    expect(submit.querySelector('[data-slot="button-spinner"]')).toBeNull();
  });

  it("shows pending state for keyboard form submission too", async () => {
    let resolve!: () => void;
    render(<form action={() => new Promise<void>((done) => { resolve = done; })}><Button type="submit">Создать</Button></form>);
    const button = screen.getByRole("button", { name: "Создать" }) as HTMLButtonElement;
    fireEvent.submit(button.closest("form")!);
    await waitFor(() => expect(button.disabled).toBe(true));
    expect(button.getAttribute("aria-busy")).toBe("true");
    await act(async () => { resolve(); });
    expect(button.disabled).toBe(false);
  });
});
