import { createRoot } from "react-dom/client";
import ConfirmDialog from "../components/ConfirmDialog";

export function confirm(title: string, content: string): Promise<boolean> {
  return new Promise((resolve) => {
    const div = document.createElement("div");
    document.body.appendChild(div);
    const root = createRoot(div);

    const handleClose = (result: boolean) => {
      root.unmount();
      document.body.removeChild(div);
      resolve(result);
    };

    root.render(
      <ConfirmDialog open title={title} content={content} onClose={handleClose} />
    );
  });
}
