import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EditDetailsDialog from "./EditDetailsDialog";

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

describe("details drafts across background updates", () => {
  it("keeps the unsaved synopsis and cast when the same title is refreshed", () => {
    const content = { id: "title-1", title: "Test series", synopsis: "Saved synopsis", cast_members: [{ name: "Saved actor" }] };
    const props = { open: true, onOpenChange: vi.fn(), content };
    const { rerender } = render(<EditDetailsDialog {...props} />);
    fireEvent.change(screen.getByDisplayValue("Saved synopsis"), { target: { value: "Unsaved synopsis" } });
    fireEvent.change(screen.getByDisplayValue("Saved actor"), { target: { value: "Unsaved actor" } });
    rerender(<EditDetailsDialog {...props} content={{ ...content, cast_members: [{ name: "Saved actor" }] }} />);
    expect(screen.getByDisplayValue("Unsaved synopsis")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Unsaved actor")).toBeInTheDocument();
  });

  it("loads current details when switching to a different title", () => {
    const props = { open: true, onOpenChange: vi.fn(), content: { id: "title-1", title: "First", synopsis: "First synopsis" } };
    const { rerender } = render(<EditDetailsDialog {...props} />);
    fireEvent.change(screen.getByDisplayValue("First synopsis"), { target: { value: "First draft" } });
    rerender(<EditDetailsDialog {...props} content={{ id: "title-2", title: "Second", synopsis: "Second synopsis" }} />);
    expect(screen.getByDisplayValue("Second synopsis")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("First draft")).not.toBeInTheDocument();
  });
});