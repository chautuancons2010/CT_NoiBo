import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FileUpload, ImageUpload } from "./Uploads";
import { createRef } from "react";

afterEach(cleanup);

describe("file fields", () => {
  it("forwards the actual file input for existing upload handlers", () => {
    const ref = createRef<HTMLInputElement>();
    render(<FileUpload label="Tài liệu" name="file" ref={ref} />);
    const field = screen.getByLabelText("Tài liệu");
    expect(ref.current).toBe(field);
    const file = new File(["a"], "test.pdf", { type: "application/pdf" });
    fireEvent.change(field, { target: { files: [file] } });
    expect(ref.current?.files?.[0]).toBe(file);
  });
  it("keeps the native field attributes and passes selected files to the form handler", () => {
    const onChange = vi.fn();
    render(<FileUpload label="Chứng từ" name="document" accept="application/pdf" onChange={onChange} required />);
    const field = screen.getByLabelText("Chứng từ", { exact: false });
    expect(field).toHaveAttribute("type", "file");
    expect(field).toHaveAttribute("name", "document");
    expect(field).toHaveAttribute("accept", "application/pdf");
    expect(field).toBeRequired();
    const file = new File(["sample"], "Chung-tu.pdf", { type: "application/pdf" });
    fireEvent.change(field, { target: { files: [file] } });
    expect(onChange).toHaveBeenCalledOnce();
    expect(onChange.mock.calls[0][0].target.files[0]).toBe(file);
    expect(screen.getByText("Chung-tu.pdf")).toBeInTheDocument();
  });

  it("updates multiple-file counts and clears its selection label on a form reset", () => {
    render(<form aria-label="Chứng từ"><FileUpload label="Tệp" name="files" multiple /><button type="reset">Đặt lại</button></form>);
    const field = screen.getByLabelText("Tệp", { exact: true });
    fireEvent.change(field, { target: { files: [new File(["a"], "A.pdf"), new File(["b"], "B.pdf")] } });
    expect(screen.getByText("2 tệp")).toBeInTheDocument();
    fireEvent.reset(screen.getByRole("form", { name: "Chứng từ" }));
    expect(screen.getByText("Chưa chọn tệp")).toBeInTheDocument();
  });

  it("retains disabled fields and the image picker restriction", () => {
    render(<ImageUpload label="Ảnh" name="photo" disabled />);
    expect(screen.getByLabelText("Ảnh")).toBeDisabled();
    expect(screen.getByLabelText("Ảnh")).toHaveAttribute("accept", "image/*");
  });
});
